import { createPublicClient, http } from 'viem';
import { ROUTER_ABI } from '@/lib/backend/routing/dex-registry';
import { bsc } from 'viem/chains';

const publicClient = createPublicClient({
    chain: bsc,
    transport: http(),
  });
const result = await publicClient.readContract({
    address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [BigInt(0), ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x55d398326f99059ff775485246999027b3197955"]],
  }) as bigint[];

console.log(result);