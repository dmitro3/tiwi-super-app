/**
 * Allowance Utilities
 */

import { type Address, encodeFunctionData, parseAbi } from "viem";
import { getPublicClient, isNativeToken } from "./transfer";

const ERC20_ABI = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
]);

/**
 * Check allowance for a token
 */
export async function getAllowance(
    chainId: number,
    tokenAddress: string,
    owner: string,
    spender: string
): Promise<bigint> {
    // If native token, return max uint256 as it doesn't need approval
    if (isNativeToken(tokenAddress)) {
        return BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    }

    const publicClient = getPublicClient(chainId);
    const allowance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner as Address, spender as Address],
    });
    return allowance as bigint;
}

/**
 * Approve a token for spending
 */
export async function approveToken(
    walletClient: any,
    tokenAddress: string,
    spender: string,
    amount: bigint
): Promise<`0x${string}`> {
    if (isNativeToken(tokenAddress)) {
        throw new Error("Native tokens do not need approval");
    }

    const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender as Address, amount],
    });

    const hash = await walletClient.sendTransaction({
        to: tokenAddress as `0x${string}`,
        data,
    });

    return hash as `0x${string}`;
}
