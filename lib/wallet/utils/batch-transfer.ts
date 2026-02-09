
import { type Address, parseAbi, encodeFunctionData, type PublicClient, type WalletClient } from "viem";

export const DISPERSE_APP_ADDRESS = "0xD152f549545093347A162Dce210e7293f1452150";

export const DISPERSE_ABI = parseAbi([
    "function disperseEther(address[] recipients, uint256[] values) external payable",
    "function disperseToken(address token, address[] recipients, uint256[] values) external",
    "function disperseTokenSimple(address token, address[] recipients, uint256[] values) external"
]);

/**
 * Batch transfer native tokens (ETH, MATIC, BNB, etc.)
 * Uses Disperse.app contract
 */
export async function batchTransferNative(
    walletClient: WalletClient,
    recipients: string[],
    amountPerRecipient: bigint
): Promise<`0x${string}`> {
    const values = new Array(recipients.length).fill(amountPerRecipient);
    const totalValue = amountPerRecipient * BigInt(recipients.length);

    const { request } = await (walletClient as any).prepareTransactionRequest({
        to: DISPERSE_APP_ADDRESS,
        value: totalValue,
        data: encodeFunctionData({
            abi: DISPERSE_ABI,
            functionName: "disperseEther",
            args: [recipients as Address[], values],
        }),
        account: (walletClient as any).account,
    });

    const hash = await walletClient.sendTransaction(request);
    return hash;
}

/**
 * Batch transfer ERC20 tokens
 * NOTE: Requires prior Approval of tokens to DISPERSE_APP_ADDRESS
 */
export async function batchTransferERC20(
    walletClient: WalletClient,
    tokenAddress: string,
    recipients: string[],
    amountPerRecipient: bigint
): Promise<`0x${string}`> {
    const values = new Array(recipients.length).fill(amountPerRecipient);

    const hash = await walletClient.sendTransaction({
        to: DISPERSE_APP_ADDRESS,
        data: encodeFunctionData({
            abi: DISPERSE_ABI,
            functionName: "disperseToken",
            args: [tokenAddress as Address, recipients as Address[], values],
        }),
        account: (walletClient as any).account,
        chain: (walletClient as any).chain,
    });

    return hash;
}
