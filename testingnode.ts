// getPairs.js - Complete Uniswap V2 Pair Finder with Viem
import { createPublicClient, http, getAddress, isAddress } from 'viem';
import { mainnet, bsc } from 'viem/chains';

// Uniswap V2 Factory Addresses [citation:10]
const UNISWAP_FACTORY = {
    ethereum: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    bsc: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6'
};

// Token Addresses
const TOKENS = {
    ethereum: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    bsc: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
    }
};

// Uniswap V2 Factory ABI (getPair function only) [citation:3][citation:7]
const FACTORY_ABI = [
    {
        "constant": true,
        "inputs": [
            { "name": "tokenA", "type": "address" },
            { "name": "tokenB", "type": "address" }
        ],
        "name": "getPair",
        "outputs": [{ "name": "pair", "type": "address" }],
        "type": "function"
    }
];

// Uniswap V2 Pair ABI (for getting reserves)
const PAIR_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            { "name": "reserve0", "type": "uint112" },
            { "name": "reserve1", "type": "uint112" },
            { "name": "blockTimestampLast", "type": "uint32" }
        ],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token0",
        "outputs": [{ "name": "", "type": "address" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token1",
        "outputs": [{ "name": "", "type": "address" }],
        "type": "function"
    }
];

// Timeout wrapper function
async function fastRpcCall(fn, timeoutMs = 500) {
    return Promise.race([
        fn(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`RPC call timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

// Main function to get pair address
async function getPairAddress(publicClient, factoryAddress, tokenA, tokenB) {
    try {
        // Validate addresses
        if (!isAddress(tokenA) || !isAddress(tokenB)) {
            throw new Error('Invalid token address');
        }

        const checksummedTokenA = getAddress(tokenA);
        const checksummedTokenB = getAddress(tokenB);
        const checksummedFactory = getAddress(factoryAddress);

        // Try primary order
        const pairAddress = await publicClient.readContract({
            address: checksummedFactory,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [checksummedTokenA, checksummedTokenB],
        });
        console.log("🚀 ~ getPairAddress ~ pairAddress:", { [checksummedTokenA]: { pairAddress }, [checksummedTokenB]: { pairAddress } })

        // If zero address, try reverse order [citation:3]
        if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
            try {
                const reversePair = await fastRpcCall(async () => {
                    return await publicClient.readContract({
                        address: checksummedFactory,
                        abi: FACTORY_ABI,
                        functionName: 'getPair',
                        args: [checksummedTokenB, checksummedTokenA],
                    });
                }, 500);

                if (reversePair && reversePair !== '0x0000000000000000000000000000000000000000') {
                    return getAddress(reversePair);
                }
            } catch {
                // Reverse order failed, continue
            }
            return null;
        }

        return getAddress(pairAddress);

    } catch (error) {
        console.error(`Error getting pair address: ${error.message}`);
        return null;
    }
}

// Get reserves from pair contract
async function getPairReserves(publicClient, pairAddress) {
    try {
        if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
            return null;
        }

        const reserves = await publicClient.readContract({
            address: getAddress(pairAddress),
            abi: PAIR_ABI,
            functionName: 'getReserves',
        });
        console.log("🚀 ~ getPairReserves ~ reserves:", { [pairAddress]: { reserves } })

        // Get token order
        const token0 = await publicClient.readContract({
            address: getAddress(pairAddress),
            abi: PAIR_ABI,
            functionName: 'token0',
        });
        console.log("🚀 ~ getPairReserves ~ token0:", { [pairAddress]: { token0 } })
        const token1 = await publicClient.readContract({
            address: getAddress(pairAddress),
            abi: PAIR_ABI,
            functionName: 'token1',
        });
        console.log("🚀 ~ getPairReserves ~ token1:", { [pairAddress]: { token1 } })
        return {
            reserve0: reserves[0],
            reserve1: reserves[1],
            token0: getAddress(token0),
            token1: getAddress(token1),
            timestamp: reserves[2]
        };

    } catch (error) {
        console.error(`Error getting reserves: ${error.message}`);
        return null;
    }
}

// Format reserves for display
function formatReserves(reserves, decimals0 = 18, decimals1 = 18) {
    if (!reserves) return null;

    const reserve0Formatted = Number(reserves.reserve0) / (10 ** decimals0);
    const reserve1Formatted = Number(reserves.reserve1) / (10 ** decimals1);

    return {
        [`${reserves.token0.slice(0, 8)}...`]: reserve0Formatted.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }),
        [`${reserves.token1.slice(0, 8)}...`]: reserve1Formatted.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        })
    };
}

// Create clients for different networks
function createClients() {
    return {
        ethereum: createPublicClient({
            chain: mainnet,
            transport: http(), // Replace with your RPC
            batch: {
                multicall: true
            }
        }),
        bsc: createPublicClient({
            chain: bsc,
            transport: http(), // Public BSC RPC
            batch: {
                multicall: true
            }
        })
    };
}

// Main execution function
async function main() {
    console.log('🔍 Uniswap V2 Pair Finder\n');

    const clients = createClients();

    // Example 1: Find WBNB-BUSD pair on BSC
    console.log('1. Finding WBNB-BUSD pair on BSC:');
    const wbnbBusdPair = await getPairAddress(
        clients.bsc,
        UNISWAP_FACTORY.bsc,
        TOKENS.bsc.WBNB,
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
    );
    console.log("🚀 ~ main ~ wbnbBusdPair: for ETH/WBNB", { wbnbBusdPair })

    if (wbnbBusdPair) {
        console.log(`   Pair Address: ${wbnbBusdPair}`);

        const reserves = await getPairReserves(clients.bsc, wbnbBusdPair);
        if (reserves) {
            console.log('   Reserves:', formatReserves(reserves));
        }
    } else {
        console.log('   No pair found');
    }

    console.log('\n---\n');

    // Example 2: Find WETH-USDC pair on Ethereum
    console.log('2. Finding WETH-USDC pair on Ethereum:');
    const wethUsdcPair = await getPairAddress(
        clients.ethereum,
        UNISWAP_FACTORY.ethereum,
        TOKENS.ethereum.WETH,
        TOKENS.ethereum.USDC
    );

    if (wethUsdcPair) {
        console.log(`   Pair Address: ${wethUsdcPair}`);

        const reserves = await getPairReserves(clients.ethereum, wethUsdcPair);
        if (reserves) {
            console.log('   Reserves:', formatReserves(reserves, 18, 6)); // USDC has 6 decimals
        }
    } else {
        console.log('   No pair found');
    }

    console.log('\n---\n');

    // Example 3: Try a non-existent pair
    console.log('3. Testing non-existent pair (WBNB-random):');
    const randomToken = '0x0000000000000000000000000000000000000001';
    const nonExistentPair = await getPairAddress(
        clients.bsc,
        UNISWAP_FACTORY.bsc,
        TOKENS.bsc.WBNB,
        randomToken
    );
    console.log(`   Result: ${nonExistentPair ? 'Found' : 'Not found (as expected)'}`);
}

// Package.json setup instructions
// console.log(`
// === SETUP INSTRUCTIONS ===
// 1. Create a new Node.js project:
//    mkdir uniswap-pair-finder
//    cd uniswap-pair-finder
//    npm init -y

// 2. Install required dependencies:
//    npm install viem dotenv

// 3. Create a .env file with your RPC URLs:
//    ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
//    BSC_RPC_URL=https://bsc-dataseed.binance.org/

// 4. Save this script as getPairs.js

// 5. Run the script:
//    node getPairs.js
// `);

// Uncomment to run immediately
main().catch(console.error);
const ROUTER_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "address[]", "name": "path", "type": "address[]" }
        ],
        "name": "getAmountsOut",
        "outputs": [
            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
            { "internalType": "address[]", "name": "path", "type": "address[]" }
        ],
        "name": "getAmountsIn",
        "outputs": [
            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
const publicClient = createClients().bsc;
const amounts = await publicClient.readContract({
    address: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'),
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [BigInt('2533366033517030856'), ["0xDA1060158F7D593667cCE0a15DB346BB3FfB3596","0x55d398326f99059fF775485246999027B3197955","0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56","0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"]],
});
console.log("🚀 ~ amounts:", {amounts})
