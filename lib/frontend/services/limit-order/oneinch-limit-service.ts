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
import type { CreateLimitOrderParams, LimitOrderResult, LimitOrderStatus } from './types';

// The 1inch Limit Order V4 contract address is the same on all supported chains
const LIMIT_ORDER_V4_CONTRACT = '0x111111125421caae952e9030e29267d33d1ee0b9' as `0x${string}`;

export class OneInchLimitService {
    private readonly API_BASE = 'https://api.1inch.dev/limit-order/v4.0';
    private readonly API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || ''; // Use public key if possible, or proxy through backend

    /**
     * Create and submit a limit order
     */
    async createAndSubmitOrder(
        params: CreateLimitOrderParams,
        walletClient: WalletClient,
        onStatusUpdate?: (status: LimitOrderStatus) => void
    ): Promise<LimitOrderResult> {
        const { fromToken, toToken, fromAmount, limitPrice, userAddress, expiresInSeconds } = params;
        const chainId = fromToken.chainId;

        if (!chainId) throw new Error('Chain ID is required');

        try {
            // 1. Prepare amounts
            const makingAmount = parseUnits(fromAmount, fromToken.decimals || 18);
            // takingAmount = makingAmount * limitPrice
            const toAmountNum = parseFloat(fromAmount) * parseFloat(limitPrice);
            const takingAmount = parseUnits(toAmountNum.toFixed(toToken.decimals || 18), toToken.decimals || 18);

            onStatusUpdate?.({ stage: 'approving' as any, message: 'Preparing limit order...' });

            // 2. Build Maker Traits
            const expiration = expiresInSeconds > 0
                ? Math.floor(Date.now() / 1000) + expiresInSeconds
                : 0;

            const makerTraits = MakerTraits.default();
            if (expiration > 0) {
                makerTraits.withExpiration(BigInt(expiration));
            }

            // Allow partial and multiple fills
            makerTraits.allowPartialFills();
            makerTraits.allowMultipleFills();

            // 3. Build the order
            const order = new LimitOrder({
                makerAsset: new OneInchAddress(fromToken.address),
                takerAsset: new OneInchAddress(toToken.address),
                makingAmount: makingAmount,
                takingAmount: takingAmount,
                maker: new OneInchAddress(userAddress),
            }, makerTraits);

            onStatusUpdate?.({ stage: 'signing' as any, message: 'Please sign the order in your wallet...' });

            // 4. Sign the order using EIP-712
            const typedData = order.getTypedData(chainId);

            const signature = await walletClient.signTypedData({
                account: userAddress as `0x${string}`,
                domain: typedData.domain as any,
                types: typedData.types as any,
                primaryType: 'Order',
                message: typedData.message as any,
            });

            onStatusUpdate?.({ stage: 'submitting' as any, message: 'Submitting order to 1inch...' });

            // 5. Submit to 1inch API
            const builtOrder = order.build();
            const result = await this.submitOrderToApi(chainId, builtOrder, signature);

            onStatusUpdate?.({ stage: 'completed' as any, message: 'Limit order placed successfully!' });

            return {
                orderHash: result.orderHash || order.getOrderHash(chainId),
                order: builtOrder,
                signature
            };

        } catch (error: any) {
            console.error('[OneInchLimitService] Error creating limit order:', error);
            onStatusUpdate?.({
                stage: 'failed' as any,
                message: error.message || 'Failed to create limit order',
                error
            });
            throw error;
        }
    }

    /**
     * Submit the signed order to 1inch API
     */
    private async submitOrderToApi(chainId: number, order: LimitOrderV4Struct, signature: string) {
        const url = `${this.API_BASE}/${chainId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order,
                signature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.description || errorData.message || `1inch API error: ${response.statusText}`);
        }

        return await response.json();
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
