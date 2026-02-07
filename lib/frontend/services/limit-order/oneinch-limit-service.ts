/**
 * OneInch Limit Order Service
 * 
 * Handles creation, signing, and submission of 1inch Limit Orders (V4).
 */

import {
    LimitOrder,
    MakerTraits,
    LimitOrderV4Struct,
    Address as OneInchAddress
} from '@1inch/limit-order-sdk';
import {
    parseUnits,
    type WalletClient,
} from 'viem';
import { getAllowance, approveToken } from '@/lib/wallet/utils/allowance';
import type { CreateLimitOrderParams, LimitOrderResult, LimitOrderStatus } from './types';

// The 1inch Limit Order V4 contract address is the same on all supported chains
const LIMIT_ORDER_V4_CONTRACT = '0x111111125421caae952e9030e29267d33d1ee0b9' as `0x${string}`;

export class OneInchLimitService {
    private readonly API_BASE = 'https://api.1inch.dev/orderbook/v4.1';
    private readonly API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || ''; // Use public key if possible, or proxy through backend

    /**
     * Create and submit a limit order
     */
    async createAndSubmitOrder(
        params: CreateLimitOrderParams,
        walletClient: WalletClient,
        onStatusUpdate?: (status: LimitOrderStatus) => void
    ): Promise<LimitOrderResult> {
        const { fromToken, toToken, fromAmount, limitPrice, userAddress, recipientAddress, expiresInSeconds } = params;
        const chainId = fromToken.chainId;

        if (!chainId) throw new Error('Chain ID is required');

        try {
            // 1. Prepare amounts with high precision
            // Use BigInt for amounts to avoid floating point issues
            const makingAmount = parseUnits(fromAmount, fromToken.decimals || 18);

            // Calculate takingAmount = makingAmount * limitPrice
            // We use a temporary high-precision calculation to avoid rounding errors
            const toAmountNum = parseFloat(fromAmount) * parseFloat(limitPrice);
            // Ensure we don't have too many decimals for the taking asset
            const takingAmountStr = toAmountNum.toFixed(toToken.decimals || 18);
            const takingAmount = parseUnits(takingAmountStr, toToken.decimals || 18);

            if (makingAmount <= BigInt(0) || takingAmount <= BigInt(0)) {
                throw new Error('Making and taking amounts must be greater than zero');
            }

            // 2. Check and handle allowance
            onStatusUpdate?.({ stage: 'approving' as any, message: 'Checking token allowance...' });

            const { isNativeToken } = await import('@/lib/wallet/utils/transfer');

            if (isNativeToken(fromToken.address)) {
                throw new Error(`Limit orders cannot be placed with native ${fromToken.symbol}. please use a wrapped version like W${fromToken.symbol} instead.`);
            }

            const currentAllowance = await getAllowance(
                chainId,
                fromToken.address,
                userAddress,
                LIMIT_ORDER_V4_CONTRACT
            );

            if (currentAllowance < makingAmount) {
                onStatusUpdate?.({ stage: 'approving' as any, message: 'Please approve the token for 1inch...' });
                const approveTx = await approveToken(
                    walletClient,
                    fromToken.address,
                    LIMIT_ORDER_V4_CONTRACT,
                    makingAmount * BigInt(100) // Approve plenty
                );
                onStatusUpdate?.({ stage: 'approving' as any, message: 'Waiting for approval confirmation...' });

                const { getPublicClient } = await import('@/lib/wallet/utils/transfer');
                const publicClient = getPublicClient(chainId);
                await publicClient.waitForTransactionReceipt({ hash: approveTx });
            }

            // 3. Build Maker Traits
            let expiration = 0;
            if (expiresInSeconds > 0) {
                // Determine if absolute or relative
                if (expiresInSeconds < 365 * 24 * 60 * 60 * 10) {
                    expiration = Math.floor(Date.now() / 1000) + expiresInSeconds;
                } else {
                    expiration = expiresInSeconds;
                }
            } else {
                // Default to 24 hours if not specified
                expiration = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
            }

            const makerTraits = MakerTraits.default();
            makerTraits.withExpiration(BigInt(expiration));
            makerTraits.allowPartialFills();
            makerTraits.allowMultipleFills();

            // 4. Build the order
            const salt = BigInt(Date.now());
            const order = new LimitOrder({
                makerAsset: new OneInchAddress(fromToken.address),
                takerAsset: new OneInchAddress(toToken.address),
                makingAmount: makingAmount,
                takingAmount: takingAmount,
                maker: new OneInchAddress(userAddress),
                receiver: recipientAddress ? new OneInchAddress(recipientAddress) : new OneInchAddress(userAddress),
                salt: salt,
            }, makerTraits);

            onStatusUpdate?.({ stage: 'signing' as any, message: 'Please sign the order in your wallet...' });

            // 5. Build EIP-712 payload manually for maximum wallet compatibility
            // This avoids issues with SDK quirks or viem version mismatches
            const domain = {
                name: '1inch Limit Order Protocol',
                version: '4',
                chainId: chainId,
                verifyingContract: LIMIT_ORDER_V4_CONTRACT,
            };

            const types = {
                Order: [
                    { name: 'salt', type: 'uint256' },
                    { name: 'maker', type: 'address' },
                    { name: 'receiver', type: 'address' },
                    { name: 'makerAsset', type: 'address' },
                    { name: 'takerAsset', type: 'address' },
                    { name: 'makingAmount', type: 'uint256' },
                    { name: 'takingAmount', type: 'uint256' },
                    { name: 'makerTraits', type: 'uint256' },
                ],
            };

            const builtOrder = order.build();

            console.log('[OneInchLimitService] Signing payload:', {
                domain,
                message: builtOrder
            });

            // Sign using viem
            const signature = await walletClient.signTypedData({
                account: userAddress as `0x${string}`,
                domain: domain as any,
                types: types as any,
                primaryType: 'Order',
                message: builtOrder as any,
            });

            console.log('[OneInchLimitService] Signature received:', signature);

            onStatusUpdate?.({ stage: 'submitting' as any, message: 'Submitting order to 1inch network...' });

            // 6. Submit to 1inch API via proxy
            const orderHash = order.getOrderHash(chainId);
            const result = await this.submitOrderToApi(chainId, builtOrder, signature, orderHash);

            onStatusUpdate?.({ stage: 'completed' as any, message: 'Limit order placed successfully!' });

            return {
                orderHash: result.orderHash || order.getOrderHash(chainId),
                order: builtOrder,
                signature
            };

        } catch (error: any) {
            console.error('[OneInchLimitService] Critical error:', error);

            // Handle specific EIP-712 errors or RPC errors
            let userMessage = error.message || 'Failed to place limit order';
            if (userMessage.includes('User rejected')) {
                userMessage = 'Signature request rejected by user.';
            } else if (userMessage.includes('JSON')) {
                userMessage = 'Wallet communication error. Please try refreshing your wallet connection.';
            }

            onStatusUpdate?.({
                stage: 'failed' as any,
                message: userMessage,
                error
            });
            throw error;
        }
    }

    /**
   * Submit the signed order to our backend proxy (bypasses CSP and protects API key)
   */
    private async submitOrderToApi(chainId: number, order: LimitOrderV4Struct, signature: string, orderHash: string) {
        const url = `/api/limit-order?chainId=${chainId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderHash,
                signature,
                data: order
            }, (key, value) => {
                // Serialize BigInts as strings for the JSON payload
                return typeof value === 'bigint' ? value.toString() : value;
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.description || data.message || `1inch submission error: ${response.statusText}`);
        }

        return data;
    }

    /**
     * Proxy method for backend submission if needed
     */
    async submitThroughBackend(chainId: number, order: any, signature: string) {
        const response = await fetch('/api/v1/swap/limit-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chainId, order, signature })
        });

        if (!response.ok) {
            throw new Error('Failed to submit limit order via backend');
        }

        return await response.json();
    }
}

export const oneInchLimitService = new OneInchLimitService();
