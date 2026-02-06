/**
 * Wallet Transfer Utilities
 * 
 * Handles wallet-to-wallet transfers for both EVM and Solana chains
 */

import { getAddress, type Address } from "viem";
import { createPublicClient, http, custom, type Chain } from "viem";
import { mainnet, arbitrum, optimism, polygon, base, bsc } from "viem/chains";
import { getRpcUrl, RPC_TRANSPORT_OPTIONS } from "@/lib/backend/utils/rpc-config";

// Chain mapping
const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  8453: base,
  56: bsc,
};

// Solana chain ID
export const SOLANA_CHAIN_ID = 7565164;
export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Get public client for EVM chain
 */
export function getPublicClient(chainId: number) {
  const chain = CHAIN_MAP[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  // Use custom RPC if available, otherwise fallback to default
  const rpcUrl = getRpcUrl(chainId);

  // ✅ ENHANCEMENT: If in browser and wallet is on correct chain, use it as transport
  // This is 100% more reliable than public RPCs (prevents 'Failed to fetch' errors)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      // Create a temporary client to check chainId without complex state
      const provider = (window as any).ethereum;

      return createPublicClient({
        chain,
        transport: custom(provider),
      });
    } catch (e) {
      console.warn('[getPublicClient] Failed to use wallet provider, falling back to RPC:', rpcUrl);
    }
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl, RPC_TRANSPORT_OPTIONS),
  });
}

/**
 * Check if address is native token (ETH, MATIC, etc.)
 */
export function isNativeToken(address: string): boolean {
  return (
    address === "0x0000000000000000000000000000000000000000" ||
    address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  );
}

/**
 * Convert amount to smallest unit (wei, etc.)
 */
export function toSmallestUnit(amount: string, decimals: number): string {
  const amountStr = amount.toString().trim();

  if (amountStr.includes("e") || amountStr.includes("E")) {
    const num = parseFloat(amountStr);
    const parts = num.toFixed(decimals).split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1] || "";
    const paddedDecimal = decimalPart.padEnd(decimals, "0").substring(0, decimals);
    return integerPart + paddedDecimal;
  }

  const decimalIndex = amountStr.indexOf(".");
  if (decimalIndex === -1) {
    const amountBigInt = BigInt(amountStr);
    const decimalsMultiplier = BigInt(10 ** decimals);
    return (amountBigInt * decimalsMultiplier).toString();
  }

  const integerPart = amountStr.substring(0, decimalIndex) || "0";
  let decimalPart = amountStr.substring(decimalIndex + 1);

  if (decimalPart.length > decimals) {
    decimalPart = decimalPart.substring(0, decimals);
  } else {
    decimalPart = decimalPart.padEnd(decimals, "0");
  }

  return integerPart + decimalPart;
}

/**
 * Transfer native token (ETH, MATIC, etc.) on EVM
 */
export async function transferNativeToken(
  walletClient: any,
  toAddress: string,
  amount: bigint
): Promise<`0x${string}`> {
  const hash = await walletClient.sendTransaction({
    to: toAddress as `0x${string}`,
    value: amount,
  });
  return hash as `0x${string}`;
}

/**
 * Transfer ERC20 token on EVM
 */
export async function transferERC20Token(
  walletClient: any,
  tokenAddress: string,
  toAddress: string,
  amount: bigint
): Promise<`0x${string}`> {
  const { encodeFunctionData } = await import("viem");

  const transferABI = [
    {
      constant: false,
      inputs: [
        { name: "_to", type: "address" },
        { name: "_value", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ name: "", type: "bool" }],
      type: "function",
    },
  ] as const;

  const data = encodeFunctionData({
    abi: transferABI,
    functionName: "transfer",
    args: [toAddress as Address, amount],
  });

  const hash = await walletClient.sendTransaction({
    to: tokenAddress as `0x${string}`,
    data,
  });

  return hash as `0x${string}`;
}

/**
 * Transfer SOL on Solana
 */
export async function transferSOL(
  solanaWallet: any,
  toAddress: string,
  amount: bigint
): Promise<string> {
  const { PublicKey, SystemProgram, Transaction } = await import("@solana/web3.js");
  const { createSolanaConnection } = await import("@/lib/wallet/utils/solana");

  const connection = await createSolanaConnection();
  const recipientPubkey = new PublicKey(toAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: solanaWallet.publicKey,
      toPubkey: recipientPubkey,
      lamports: amount,
    })
  );

  const signature = await solanaWallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Transfer SPL token on Solana
 */
export async function transferSPLToken(
  solanaWallet: any,
  tokenMint: string,
  toAddress: string,
  amount: bigint
): Promise<string> {
  const { PublicKey, Transaction } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress, createTransferInstruction } = await import("@solana/spl-token");
  const { createSolanaConnection } = await import("@/lib/wallet/utils/solana");

  const connection = await createSolanaConnection();
  const mintPubkey = new PublicKey(tokenMint);
  const recipientPubkey = new PublicKey(toAddress);

  const sourceTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    solanaWallet.publicKey
  );
  const destTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    recipientPubkey
  );

  const transferInstruction = createTransferInstruction(
    sourceTokenAccount,
    destTokenAccount,
    solanaWallet.publicKey,
    amount
  );

  const transaction = new Transaction().add(transferInstruction);
  const signature = await solanaWallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

