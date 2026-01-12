/**
 * Swap Executor Service
 * 
 * Handles swap execution for all routers (LiFi, PancakeSwap, Uniswap, Jupiter).
 * Manages wallet connection, transaction signing, and execution.
 */

import type { RouterRoute } from '@/lib/backend/routers/types';

export interface SwapExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Check if token approval is needed
 */
async function checkTokenApproval(
  provider: any,
  walletAddress: string,
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  chainId: number
): Promise<boolean> {
  try {
    // ERC20 allowance ABI
    const allowanceABI = [
      {
        inputs: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const;
    
    const { createPublicClient, http, getAddress } = await import('viem');
    const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import('viem/chains');
    
    const chainMap: Record<number, any> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };
    
    const chain = chainMap[chainId];
    if (!chain) {
      console.warn(`[SwapExecutor] Chain ${chainId} not in chainMap, skipping approval check`);
      return false; // Assume approval not needed if we can't check
    }
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });
    
    const currentAllowance = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: allowanceABI,
      functionName: 'allowance',
      args: [getAddress(walletAddress), getAddress(spenderAddress)],
    });
    
    const amountBigInt = BigInt(amount);
    const hasEnoughAllowance = currentAllowance >= amountBigInt;
    
    console.log('[SwapExecutor] Approval check:', {
      token: tokenAddress,
      spender: spenderAddress,
      currentAllowance: currentAllowance.toString(),
      requiredAmount: amount,
      hasEnoughAllowance,
    });
    
    return !hasEnoughAllowance;
  } catch (error: any) {
    console.warn('[SwapExecutor] Error checking approval, assuming approval needed:', error);
    return true; // If we can't check, assume approval is needed to be safe
  }
}

/**
 * Execute token approval
 */
async function executeTokenApproval(
  provider: any,
  walletAddress: string,
  tokenAddress: string,
  spenderAddress: string,
  chainId: number
): Promise<string> {
  try {
    const { createWalletClient, custom, getAddress } = await import('viem');
    const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import('viem/chains');
    
    const chainMap: Record<number, any> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };
    
    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    
    const walletClient = createWalletClient({
      chain,
      transport: custom(provider),
      account: walletAddress as `0x${string}`,
    });
    
    // ERC20 approve ABI
    const approveABI = [
      {
        inputs: [
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;
    
    // Approve maximum amount (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    console.log('[SwapExecutor] Executing token approval:', {
      token: tokenAddress,
      spender: spenderAddress,
      amount: 'MAX',
    });
    
    const hash = await walletClient.writeContract({
      address: getAddress(tokenAddress),
      abi: approveABI,
      functionName: 'approve',
      args: [getAddress(spenderAddress), maxApproval],
    });
    
    // Wait for approval confirmation
    const { createPublicClient, http } = await import('viem');
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });
    
    await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60000,
    });
    
    console.log('[SwapExecutor] Token approval confirmed:', hash);
    return hash;
  } catch (error: any) {
    console.error('[SwapExecutor] Approval failed:', error);
    throw new Error(`Token approval failed: ${error.message}`);
  }
}

/**
 * Execute EVM transaction from LiFi transaction request
 */
async function executeEVMLiFiTransaction(
  txRequest: any,
  walletAddress: string,
  chainId: number,
  provider: any
): Promise<string> {
  // Build transaction object from LiFi transaction request
  const transactionParams: any = {
    from: walletAddress,
    to: txRequest.to,
    data: txRequest.data,
  };
  
  // Always set value - use 0x0 if not provided
  if (txRequest.value !== undefined && txRequest.value !== null && txRequest.value !== '' && txRequest.value !== '0x0' && txRequest.value !== '0') {
    let value = txRequest.value;
    if (typeof value === 'string' && !value.startsWith('0x')) {
      value = `0x${BigInt(value).toString(16)}`;
    } else if (typeof value === 'number') {
      value = `0x${value.toString(16)}`;
    }
    transactionParams.value = value;
  } else {
    transactionParams.value = '0x0';
  }
  
  // Copy gas fields - ensure they're in hex format
  if (txRequest.gasLimit) {
    let gas = txRequest.gasLimit;
    if (typeof gas === 'string' && !gas.startsWith('0x')) {
      gas = `0x${BigInt(gas).toString(16)}`;
    } else if (typeof gas === 'number') {
      gas = `0x${gas.toString(16)}`;
    }
    transactionParams.gas = gas;
  }
  
  if (txRequest.gasPrice) {
    let gasPrice = txRequest.gasPrice;
    if (typeof gasPrice === 'string' && !gasPrice.startsWith('0x')) {
      gasPrice = `0x${BigInt(gasPrice).toString(16)}`;
    } else if (typeof gasPrice === 'number') {
      gasPrice = `0x${gasPrice.toString(16)}`;
    }
    transactionParams.gasPrice = gasPrice;
  }
  
  if (txRequest.maxFeePerGas) {
    let maxFeePerGas = txRequest.maxFeePerGas;
    if (typeof maxFeePerGas === 'string' && !maxFeePerGas.startsWith('0x')) {
      maxFeePerGas = `0x${BigInt(maxFeePerGas).toString(16)}`;
    } else if (typeof maxFeePerGas === 'number') {
      maxFeePerGas = `0x${maxFeePerGas.toString(16)}`;
    }
    transactionParams.maxFeePerGas = maxFeePerGas;
  }
  
  if (txRequest.maxPriorityFeePerGas) {
    let maxPriorityFeePerGas = txRequest.maxPriorityFeePerGas;
    if (typeof maxPriorityFeePerGas === 'string' && !maxPriorityFeePerGas.startsWith('0x')) {
      maxPriorityFeePerGas = `0x${BigInt(maxPriorityFeePerGas).toString(16)}`;
    } else if (typeof maxPriorityFeePerGas === 'number') {
      maxPriorityFeePerGas = `0x${maxPriorityFeePerGas.toString(16)}`;
    }
    transactionParams.maxPriorityFeePerGas = maxPriorityFeePerGas;
  }
  
  // Add chainId
  if (txRequest.chainId) {
    const chainIdNum = typeof txRequest.chainId === 'string' 
      ? (txRequest.chainId.startsWith('0x') ? parseInt(txRequest.chainId, 16) : parseInt(txRequest.chainId, 10))
      : parseInt(txRequest.chainId.toString());
    transactionParams.chainId = `0x${chainIdNum.toString(16)}`;
  } else {
    transactionParams.chainId = `0x${chainId.toString(16)}`;
  }
  
  // Validate transaction
  if (!transactionParams.to || !transactionParams.data) {
    throw new Error('Invalid transaction: missing to or data');
  }
  
  if (!transactionParams.data.startsWith('0x')) {
    throw new Error('Invalid transaction data: must be hex string starting with 0x');
  }
  
  // Estimate gas before sending
  try {
    const estimateParams = { ...transactionParams };
    delete estimateParams.gas;
    delete estimateParams.gasPrice;
    delete estimateParams.maxFeePerGas;
    delete estimateParams.maxPriorityFeePerGas;
    
    const estimatedGas = await provider.request({
      method: 'eth_estimateGas',
      params: [estimateParams],
    });
    
    if (!transactionParams.gas) {
      transactionParams.gas = estimatedGas;
    }
  } catch (gasError: any) {
    console.warn('[SwapExecutor] Gas estimation failed for included step:', gasError);
    // Continue with provided gas if available
    if (!transactionParams.gas) {
      throw new Error(`Gas estimation failed: ${gasError.message}`);
    }
  }
  
  // Send transaction
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [transactionParams],
  });
  
  // Wait for confirmation
  const { createPublicClient, http } = await import('viem');
  const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import('viem/chains');
  
  const chainMap: Record<number, any> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    56: bsc,
  };
  
  const chain = chainMap[chainId];
  if (chain) {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });
    
    await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 120000,
    });
  }
  
  return txHash;
}

/**
 * Get chain configuration for wallet_addEthereumChain
 */
async function getChainConfigForWallet(chainId: number): Promise<any | null> {
  // Common chain configurations
  const chainConfigs: Record<number, any> = {
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://eth.llamarpc.com'],
      blockExplorerUrls: ['https://etherscan.io'],
    },
    56: {
      chainId: '0x38',
      chainName: 'BNB Smart Chain',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      rpcUrls: ['https://bsc-dataseed1.binance.org'],
      blockExplorerUrls: ['https://bscscan.com'],
    },
    137: {
      chainId: '0x89',
      chainName: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com'],
      blockExplorerUrls: ['https://polygonscan.com'],
    },
    42161: {
      chainId: '0xa4b1',
      chainName: 'Arbitrum One',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://arb1.arbitrum.io/rpc'],
      blockExplorerUrls: ['https://arbiscan.io'],
    },
    10: {
      chainId: '0xa',
      chainName: 'Optimism',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.optimism.io'],
      blockExplorerUrls: ['https://optimistic.etherscan.io'],
    },
    8453: {
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
    },
    43114: {
      chainId: '0xa86a',
      chainName: 'Avalanche',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://snowtrace.io'],
    },
  };
  
  return chainConfigs[chainId] || null;
}

/**
 * Execute swap transaction based on router type
 */
export async function executeSwap(
  route: RouterRoute,
  walletAddress: string
): Promise<SwapExecutionResult> {
  try {
    console.log('[SwapExecutor] Executing swap with route:', route);
    
    // Route to appropriate executor based on router
    switch (route.router) {
      case 'lifi':
        return await executeLiFiSwap(route, walletAddress);
      case 'jupiter':
        return await executeJupiterSwap(route, walletAddress);
      case 'uniswap':
      case 'pancakeswap':
        return await executeEVMSwap(route, walletAddress);
      default:
        throw new Error(`Unsupported router: ${route.router}`);
    }
  } catch (error: any) {
    console.error('[SwapExecutor] Swap execution failed:', error);
    return {
      success: false,
      error: error.message || 'Swap execution failed',
    };
  }
}

/**
 * Execute LiFi swap (supports cross-chain)
 * Manually executes transactions from route steps to avoid structuredClone issues
 */
async function executeLiFiSwap(
  route: RouterRoute,
  walletAddress: string
): Promise<SwapExecutionResult> {
  try {
    // The route.raw contains the full LiFi route
    if (!route.raw) {
      throw new Error('LiFi route data missing');
    }
    
    // Check if quote has expired
    if (route.expiresAt && Date.now() > route.expiresAt) {
      throw new Error('Swap quote has expired. Please get a new quote and try again.');
    }
    
    const lifiRoute = route.raw;
    const fromChainId = route.fromToken.chainId;
    
    console.log('[SwapExecutor] Executing LiFi swap:', {
      routeId: route.routeId,
      fromChain: fromChainId,
      toChain: route.toToken.chainId,
      steps: lifiRoute.steps?.length || 0,
      expiresAt: route.expiresAt,
      isExpired: route.expiresAt ? Date.now() > route.expiresAt : false,
    });
    
    // Use LiFi SDK to get transaction requests for each step
    // This avoids cloning issues by getting transaction data first
    const { getStepTransaction } = await import('@lifi/sdk');
    
    // Execute each step in the route
    let lastTxHash: string | undefined;
    
    for (let i = 0; i < (lifiRoute.steps || []).length; i++) {
      const step = lifiRoute.steps[i];
      const stepAction = step.action as any;
      const stepChainId = stepAction.fromChainId || fromChainId;
      const stepIsSolana = stepChainId === 7565164 || stepChainId === 1151111081099710; // LiFi's Solana ID
      
      try {
        // Get provider early if needed for EVM transactions
        let provider: any = null;
        if (!stepIsSolana) {
          if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error('No Ethereum wallet found. Please install MetaMask or another wallet.');
          }
          provider = (window as any).ethereum;
        }
        
        // Check if step has includedSteps (approval steps that need to be executed first)
        if (step.includedSteps && Array.isArray(step.includedSteps) && step.includedSteps.length > 0) {
          console.log(`[SwapExecutor] Step has ${step.includedSteps.length} included steps, checking which are executable`);
          
          // Valid types for executable steps in LiFi SDK
          const VALID_STEP_TYPES = ['SWAP', 'BRIDGE', 'WRAP', 'UNWRAP'];
          
          // Execute included steps (usually approvals) first
          for (const includedStep of step.includedSteps) {
            // Check if this included step is executable
            // Only process steps with valid types or steps that already have a transactionRequest
            const hasValidType = includedStep.type && VALID_STEP_TYPES.includes(includedStep.type.toUpperCase());
            const hasTransactionRequest = !!includedStep.transactionRequest;
            
            if (!hasValidType && !hasTransactionRequest) {
              console.log(`[SwapExecutor] Skipping included step with type "${includedStep.type}" - not executable`);
              continue; // Skip this included step
            }
            
            // Get transaction request for included step if needed
            let includedTxRequest = includedStep.transactionRequest;
            
            if (!includedTxRequest && hasValidType) {
              // Need to get transaction request from LiFi SDK
              const { getStepTransaction } = await import('@lifi/sdk');
              
              // Use object spread to preserve ALL properties exactly as they are
              const includedStepClone: any = {
                ...includedStep, // Preserve all original properties (id, type, tool, estimate, etc.)
                action: {
                  ...includedStep.action, // Preserve all original action properties
                  fromAddress: walletAddress,
                  toAddress: walletAddress,
                },
                // Ensure includedSteps is always an array (SDK requires this property)
                includedSteps: Array.isArray(includedStep.includedSteps) ? includedStep.includedSteps : [],
              };
              
              try {
                console.log(`[SwapExecutor] Getting transaction for included step type: ${includedStepClone.type}`);
                const txReq = await getStepTransaction(includedStepClone, {
                  account: { address: walletAddress },
                  fromAddress: walletAddress,
                  toAddress: walletAddress,
                } as any);
                includedTxRequest = txReq.transactionRequest;
              } catch (includedError: any) {
                console.error('[SwapExecutor] Failed to get included step transaction:', includedError);
                console.error('[SwapExecutor] Included step details:', {
                  type: includedStepClone.type,
                  id: includedStepClone.id,
                  hasAction: !!includedStepClone.action,
                });
                // Don't throw - just skip this included step if it fails
                console.warn('[SwapExecutor] Skipping failed included step, continuing with main step');
                continue;
              }
            }
            
            if (includedTxRequest && !stepIsSolana && provider) {
              console.log('[SwapExecutor] Executing included step (approval)');
              await executeEVMLiFiTransaction(includedTxRequest, walletAddress, stepChainId, provider);
              
              // Wait for approval to be confirmed
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }
        
        let txRequest: any;
        
        // Check if step already has transactionRequest (some routes include it)
        if (step.transactionRequest) {
          console.log('[SwapExecutor] Step already has transactionRequest, using it directly');
          // Use existing transaction request
          txRequest = { transactionRequest: step.transactionRequest };
        } else {
          // Need to get transaction request from LiFi SDK
          // Use object spread to preserve ALL properties exactly as they are
          // Only modify action to add addresses, everything else stays the same
          const stepClone: any = {
            ...step, // Preserve all original properties (id, type, tool, estimate, etc.)
            action: {
              ...step.action, // Preserve all original action properties
              fromAddress: walletAddress,
              toAddress: walletAddress,
            },
            // Ensure includedSteps is always an array (SDK requires this property)
            includedSteps: Array.isArray(step.includedSteps) ? step.includedSteps : [],
          };
          
          console.log('[SwapExecutor] Step clone details:', {
            id: stepClone.id,
            type: stepClone.type,
            originalType: step.type,
            typeMatch: stepClone.type === step.type,
            typeOf: typeof stepClone.type,
            hasAction: !!stepClone.action,
            hasIncludedSteps: Array.isArray(stepClone.includedSteps),
            stepKeys: Object.keys(stepClone).sort(),
          });
          
          // Get transaction request from LiFi SDK
          // Pass fromAddress in both step action and options
          try {
            txRequest = await getStepTransaction(stepClone, {
              account: { address: walletAddress },
              fromAddress: walletAddress,
              toAddress: walletAddress,
            } as any);
          } catch (txError: any) {
            // Log detailed error information
            console.error('[SwapExecutor] getStepTransaction failed:', txError);
            console.error('[SwapExecutor] Error message:', txError.message);
            console.error('[SwapExecutor] Step type details:', {
              stepType: step.type,
              cloneType: stepClone.type,
              typeOf: typeof stepClone.type,
              typeValue: JSON.stringify(stepClone.type),
            });
            console.error('[SwapExecutor] Full step clone:', JSON.stringify(stepClone, null, 2));
            
            // If error mentions type, the type value might be invalid
            if (txError.message?.includes('type') || txError.message?.includes('Type')) {
              throw new Error(
                `Invalid step type: "${stepClone.type}" (type: ${typeof stepClone.type}). ` +
                `Original step type: "${step.type}". ` +
                `LiFi SDK expects one of: 'SWAP', 'BRIDGE', 'WRAP', 'UNWRAP'. ` +
                `Error: ${txError.message}`
              );
            }
            
            throw txError; // Re-throw to be caught by outer handler
          }
        }
        
        if (stepIsSolana) {
          // Execute Solana transaction
          const { getSolanaWallet } = await import('@/lib/wallet/utils/solana');
          const solanaWallet = await getSolanaWallet();
          
          if (!solanaWallet || !solanaWallet.isConnected) {
            throw new Error('Please connect your Solana wallet first');
          }
          
          const { Transaction, Connection } = await import('@solana/web3.js');
          const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
          
          // Parse transaction from LiFi
          const transaction = Transaction.from(Buffer.from(txRequest.transactionRequest.data, 'base64'));
          
          // Only update feePayer and recentBlockhash if they're not already set correctly
          // LiFi transactions should already have these set, but we ensure they're correct
          if (!transaction.feePayer || transaction.feePayer.toString() !== solanaWallet.publicKey.toString()) {
            transaction.feePayer = solanaWallet.publicKey;
          }
          
          // Get fresh blockhash if transaction doesn't have one or it's stale
          if (!transaction.recentBlockhash) {
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
          }
          
          console.log('[SwapExecutor] Sending Solana transaction:', {
            feePayer: transaction.feePayer.toString(),
            instructions: transaction.instructions.length,
            recentBlockhash: transaction.recentBlockhash?.toString().slice(0, 8) + '...',
          });
          
          // Sign and send
          const signed = await solanaWallet.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
          });
          
          await connection.confirmTransaction(signature, 'confirmed');
          lastTxHash = signature;
        } else {
          // Execute EVM transaction
          // Provider should already be set above, but ensure it's available
          if (!provider) {
            if (typeof window === 'undefined' || !(window as any).ethereum) {
              throw new Error('No Ethereum wallet found. Please install MetaMask or another wallet.');
            }
            provider = (window as any).ethereum;
          }
          
          const txData = txRequest.transactionRequest;
          
          // Note: LiFi transactions should already include approvals in the transaction data
          // We don't need to check/execute approvals separately unless they're in includedSteps
          // The TRANSFER_FROM_FAILED error might be due to:
          // 1. Transaction data not including approval
          // 2. Approval amount insufficient
          // 3. Transaction being sent before approval is confirmed
          // 
          // We handle this by ensuring includedSteps (approvals) are executed first above
          
          // Get required chainId from transaction
          let requiredChainId: number | null = null;
          if (txData.chainId) {
            requiredChainId = typeof txData.chainId === 'string' 
              ? parseInt(txData.chainId, 16) 
              : parseInt(txData.chainId.toString());
          } else if (stepChainId) {
            requiredChainId = stepChainId;
          }
          
          // Check current chain and switch if needed
          if (requiredChainId) {
            try {
              const currentChainIdHex = await provider.request({ method: 'eth_chainId' });
              const currentChainId = parseInt(currentChainIdHex, 16);
              
              if (currentChainId !== requiredChainId) {
                console.log(`[SwapExecutor] Wallet is on chain ${currentChainId}, switching to ${requiredChainId}`);
                
                try {
                  // Try to switch chain
                  await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
                  });
                  
                  // Wait a bit for chain switch to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Verify switch was successful
                  const newChainIdHex = await provider.request({ method: 'eth_chainId' });
                  const newChainId = parseInt(newChainIdHex, 16);
                  
                  if (newChainId !== requiredChainId) {
                    throw new Error(`Failed to switch to chain ${requiredChainId}. Please switch manually in your wallet.`);
                  }
                  
                  console.log(`[SwapExecutor] Successfully switched to chain ${requiredChainId}`);
                } catch (switchError: any) {
                  // If chain doesn't exist, try to add it
                  if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
                    console.log(`[SwapExecutor] Chain ${requiredChainId} not found, attempting to add it`);
                    
                    // Get chain config for adding
                    const chainConfig = await getChainConfigForWallet(requiredChainId);
                    if (chainConfig) {
                      await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [chainConfig],
                      });
                      
                      // Wait for chain to be added
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                      throw new Error(`Chain ${requiredChainId} is not supported. Please add it manually in your wallet.`);
                    }
                  } else {
                    throw new Error(`Failed to switch chain: ${switchError.message}. Please switch to chain ${requiredChainId} manually.`);
                  }
                }
              }
            } catch (chainError: any) {
              console.error('[SwapExecutor] Chain switching error:', chainError);
              throw new Error(`Chain mismatch: Please switch your wallet to the correct chain (${requiredChainId}) and try again.`);
            }
          }
          
          // Build transaction object - preserve ALL fields from LiFi transaction
          // LiFi transaction requests are complete and should be used as-is
          const transactionParams: any = {
            from: walletAddress, // Always use connected wallet address
            to: txData.to,
            data: txData.data,
          };
          
          // Always set value - use 0x0 if not provided (for token swaps)
          if (txData.value !== undefined && txData.value !== null && txData.value !== '') {
            // Ensure value is in hex format
            let value = txData.value;
            if (typeof value === 'string' && !value.startsWith('0x')) {
              // Convert decimal string to hex
              value = `0x${BigInt(value).toString(16)}`;
            } else if (typeof value === 'number') {
              value = `0x${value.toString(16)}`;
            }
            transactionParams.value = value;
          } else {
            // Default to 0x0 for token swaps (no native token sent)
            transactionParams.value = '0x0';
          }
          
          // Copy gas fields - ensure they're in hex format
          if (txData.gasLimit) {
            let gas = txData.gasLimit;
            if (typeof gas === 'string' && !gas.startsWith('0x')) {
              gas = `0x${BigInt(gas).toString(16)}`;
            } else if (typeof gas === 'number') {
              gas = `0x${gas.toString(16)}`;
            }
            transactionParams.gas = gas;
          }
          
          // Gas price (for legacy transactions)
          if (txData.gasPrice) {
            let gasPrice = txData.gasPrice;
            if (typeof gasPrice === 'string' && !gasPrice.startsWith('0x')) {
              gasPrice = `0x${BigInt(gasPrice).toString(16)}`;
            } else if (typeof gasPrice === 'number') {
              gasPrice = `0x${gasPrice.toString(16)}`;
            }
            transactionParams.gasPrice = gasPrice;
          }
          
          // EIP-1559 gas fields (for modern transactions)
          if (txData.maxFeePerGas) {
            let maxFeePerGas = txData.maxFeePerGas;
            if (typeof maxFeePerGas === 'string' && !maxFeePerGas.startsWith('0x')) {
              maxFeePerGas = `0x${BigInt(maxFeePerGas).toString(16)}`;
            } else if (typeof maxFeePerGas === 'number') {
              maxFeePerGas = `0x${maxFeePerGas.toString(16)}`;
            }
            transactionParams.maxFeePerGas = maxFeePerGas;
          }
          
          if (txData.maxPriorityFeePerGas) {
            let maxPriorityFeePerGas = txData.maxPriorityFeePerGas;
            if (typeof maxPriorityFeePerGas === 'string' && !maxPriorityFeePerGas.startsWith('0x')) {
              maxPriorityFeePerGas = `0x${BigInt(maxPriorityFeePerGas).toString(16)}`;
            } else if (typeof maxPriorityFeePerGas === 'number') {
              maxPriorityFeePerGas = `0x${maxPriorityFeePerGas.toString(16)}`;
            }
            transactionParams.maxPriorityFeePerGas = maxPriorityFeePerGas;
          }
          
          // Nonce (usually not needed, wallet handles it)
          if (txData.nonce !== undefined && txData.nonce !== null) {
            let nonce = txData.nonce;
            if (typeof nonce === 'string' && !nonce.startsWith('0x')) {
              nonce = `0x${parseInt(nonce, 10).toString(16)}`;
            } else if (typeof nonce === 'number') {
              nonce = `0x${nonce.toString(16)}`;
            }
            transactionParams.nonce = nonce;
          }
          
          // Add chainId - critical for preventing replay attacks
          if (txData.chainId) {
            const chainIdNum = typeof txData.chainId === 'string' 
              ? (txData.chainId.startsWith('0x') ? parseInt(txData.chainId, 16) : parseInt(txData.chainId, 10))
              : parseInt(txData.chainId.toString());
            transactionParams.chainId = `0x${chainIdNum.toString(16)}`;
          } else {
            // Get chainId from provider if not in txData
            try {
              const networkVersion = await provider.request({ method: 'eth_chainId' });
              transactionParams.chainId = networkVersion;
            } catch (e) {
              console.warn('[SwapExecutor] Could not get chainId from provider');
            }
          }
          
          // Log full transaction for debugging
          console.log('[SwapExecutor] Full transaction params:', {
            from: transactionParams.from,
            to: transactionParams.to,
            value: transactionParams.value,
            gas: transactionParams.gas,
            gasPrice: transactionParams.gasPrice,
            maxFeePerGas: transactionParams.maxFeePerGas,
            maxPriorityFeePerGas: transactionParams.maxPriorityFeePerGas,
            chainId: transactionParams.chainId,
            dataLength: transactionParams.data?.length,
            dataPreview: transactionParams.data?.substring(0, 20) + '...',
          });
          
          // Validate transaction before sending
          if (!transactionParams.to || !transactionParams.data) {
            throw new Error('Invalid transaction: missing to or data');
          }
          
          // Validate data is hex
          if (!transactionParams.data.startsWith('0x')) {
            throw new Error('Invalid transaction data: must be hex string starting with 0x');
          }
          
          // Validate to address is hex
          if (!transactionParams.to.startsWith('0x') || transactionParams.to.length !== 42) {
            throw new Error('Invalid transaction to address: must be valid hex address');
          }
          
          // Estimate gas before sending to catch simulation errors early
          let estimatedGas: string | null = null;
          try {
            // Create a copy for estimation (without gas to let it estimate)
            const estimateParams = { ...transactionParams };
            delete estimateParams.gas;
            delete estimateParams.gasPrice;
            delete estimateParams.maxFeePerGas;
            delete estimateParams.maxPriorityFeePerGas;
            
            estimatedGas = await provider.request({
              method: 'eth_estimateGas',
              params: [estimateParams],
            });
            console.log('[SwapExecutor] Gas estimation successful:', estimatedGas);
            
            // Use estimated gas if not provided, or if provided gas is too low
            if (!transactionParams.gas) {
              transactionParams.gas = estimatedGas;
            } else {
              // Compare provided gas with estimated (add 20% buffer)
              const providedGas = BigInt(transactionParams.gas);
              const estimatedGasBig = BigInt(estimatedGas);
              const bufferedGas = estimatedGasBig + (estimatedGasBig * BigInt(20) / BigInt(100));
              
              if (providedGas < estimatedGasBig) {
                console.warn('[SwapExecutor] Provided gas is lower than estimated, using estimated gas with buffer');
                transactionParams.gas = `0x${bufferedGas.toString(16)}`;
              }
            }
          } catch (gasError: any) {
            console.error('[SwapExecutor] Gas estimation failed:', gasError);
            
            // Parse error message for better user feedback
            const errorMessage = gasError.message || gasError.toString() || '';
            
            if (errorMessage.includes('execution reverted') || errorMessage.includes('revert')) {
              // Extract revert reason if available
              let revertReason = 'Transaction would fail';
              if (errorMessage.includes('#1002')) {
                revertReason = 'Transaction would fail: Missing token approval or insufficient balance';
              } else if (errorMessage.includes('TRANSFER_FROM_FAILED')) {
                revertReason = 'Transaction would fail: Token approval required or insufficient allowance';
              } else if (errorMessage.includes('insufficient funds')) {
                revertReason = 'Transaction would fail: Insufficient balance';
              }
              
              throw new Error(
                `Simulation Failed: ${revertReason}. ` +
                `Please ensure:\n` +
                `- You have sufficient token balance\n` +
                `- Token approval is completed (if required)\n` +
                `- Quote has not expired\n` +
                `- Slippage tolerance is appropriate\n\n` +
                `Original error: ${errorMessage}`
              );
            }
            
            // If gas estimation fails but we have gas from LiFi, proceed with it
            if (transactionParams.gas) {
              console.warn('[SwapExecutor] Gas estimation failed, using LiFi provided gas:', transactionParams.gas);
            } else {
              throw new Error(
                `Gas estimation failed: ${errorMessage}. ` +
                `Please try again or contact support if the issue persists.`
              );
            }
          }
          
          // Send transaction
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transactionParams],
          });
          
          console.log('[SwapExecutor] Transaction sent, hash:', txHash);
          
          // Wait for confirmation
          const { createPublicClient, http } = await import('viem');
          const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import('viem/chains');
          
          const chainMap: Record<number, any> = {
            1: mainnet,
            42161: arbitrum,
            10: optimism,
            137: polygon,
            8453: base,
            56: bsc,
          };
          
          const chain = chainMap[stepChainId];
          if (chain) {
            const publicClient = createPublicClient({
              chain,
              transport: http(),
            });
            
            await publicClient.waitForTransactionReceipt({
              hash: txHash as `0x${string}`,
              timeout: 120000,
            });
          }
          
          lastTxHash = txHash;
        }
        
        // Wait between steps if multiple steps
        if (i < (lifiRoute.steps || []).length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (stepError: any) {
        console.error(`[SwapExecutor] Error executing LiFi step ${i}:`, stepError);
        
        // Provide more helpful error messages
        let errorMessage = stepError.message || 'Unknown error';
        
        if (errorMessage.includes('reverted') || errorMessage.includes('execution reverted')) {
          errorMessage = 'Transaction failed. This could be due to:\n' +
            '- Insufficient token balance\n' +
            '- Slippage tolerance too low (price moved)\n' +
            '- Quote expired\n' +
            '- Insufficient gas\n\n' +
            'Please try again with a fresh quote.';
        } else if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance for this swap.';
        }
        
        throw new Error(`Failed to execute swap step: ${errorMessage}`);
      }
    }
    
    if (!lastTxHash) {
      throw new Error('No transaction hash returned from LiFi route execution');
    }
    
    return {
      success: true,
      transactionHash: lastTxHash,
    };
  } catch (error: any) {
    console.error('[SwapExecutor] LiFi swap failed:', error);
    throw error;
  }
}

/**
 * Execute Jupiter swap (Solana only)
 */
async function executeJupiterSwap(
  route: RouterRoute,
  walletAddress: string
): Promise<SwapExecutionResult> {
  try {
    // Get Solana wallet
    const { getSolanaWallet } = await import('@/lib/wallet/utils/solana');
    const solanaWallet = await getSolanaWallet();
    
    if (!solanaWallet || !solanaWallet.isConnected || !solanaWallet.publicKey) {
      throw new Error('Please connect your Solana wallet first');
    }
    
    // Jupiter provides swap transaction in route.transactionData or route.raw
    const swapTransaction = route.transactionData || route.raw?.swapTransaction;
    
    if (!swapTransaction) {
      // If transaction data not in route, fetch it from Jupiter API
      const { getJupiterSwapTransaction } = await import('@/lib/wallet/utils/jupiter');
      
      // Convert amount to smallest unit for Jupiter API
      const { toSmallestUnit } = await import('@/lib/backend/routers/transformers/amount-transformer');
      const amountInSmallest = toSmallestUnit(route.fromToken.amount, route.fromToken.decimals);
      
      const transaction = await getJupiterSwapTransaction(
        route.fromToken.address,
        route.toToken.address,
        amountInSmallest,
        route.raw || {}
      );
      
      // Set fee payer and recent blockhash
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      transaction.feePayer = solanaWallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      
      // Sign transaction with wallet
      const signed = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        transactionHash: signature,
      };
    } else {
      // Use provided transaction data
      // Parse and sign the transaction
      const { Transaction, Connection } = await import('@solana/web3.js');
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      
      // Update fee payer and recent blockhash
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      transaction.feePayer = solanaWallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      
      // Sign transaction with wallet
      const signed = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        transactionHash: signature,
      };
    }
  } catch (error: any) {
    console.error('[SwapExecutor] Jupiter swap failed:', error);
    throw error;
  }
}

/**
 * Execute EVM swap (Uniswap, PancakeSwap)
 */
async function executeEVMSwap(
  route: RouterRoute,
  walletAddress: string
): Promise<SwapExecutionResult> {
  try {
    const chainId = route.fromToken.chainId;
    
    // Get wallet client
    const { createWalletClient, custom } = await import('viem');
    const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import('viem/chains');
    
    const chainMap: Record<number, any> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };
    
    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    
    // Get provider from window
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another wallet.');
    }
    
    const provider = (window as any).ethereum;
    const walletClient = createWalletClient({
      chain,
      transport: custom(provider),
      account: walletAddress as `0x${string}`,
    });
    
    // Build swap transaction based on router
    if (route.router === 'uniswap') {
      return await executeUniswapSwap(route, walletClient, chainId);
    } else if (route.router === 'pancakeswap') {
      return await executePancakeSwapSwap(route, walletClient, chainId);
    } else {
      throw new Error(`Unsupported EVM router: ${route.router}`);
    }
  } catch (error: any) {
    console.error('[SwapExecutor] EVM swap failed:', error);
    throw error;
  }
}

/**
 * Execute Uniswap swap
 */
async function executeUniswapSwap(
  route: RouterRoute,
  walletClient: any,
  chainId: number
): Promise<SwapExecutionResult> {
  // Uniswap V2 Router addresses
  const UNISWAP_V2_ROUTER: Record<number, `0x${string}`> = {
    1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    42161: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    10: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    137: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    8453: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
  };
  
  const routerAddress = UNISWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    throw new Error(`Uniswap router not found for chain ${chainId}`);
  }
  
  // Build swap path from route steps
  const path = route.steps[0] 
    ? [route.fromToken.address, route.toToken.address] as `0x${string}`[]
    : [route.fromToken.address, route.toToken.address] as `0x${string}`[];
  
  // Convert amount to smallest unit
  const { toSmallestUnit } = await import('@/lib/backend/routers/transformers/amount-transformer');
  const amountIn = BigInt(toSmallestUnit(route.fromToken.amount, route.fromToken.decimals));
  
  // Calculate minimum amount out with slippage
  const slippageBps = Math.round(parseFloat(route.slippage) * 100);
  const amountOutMin = BigInt(route.steps[route.steps.length - 1]?.toToken.amount || '0');
  const minAmountOut = (amountOutMin * BigInt(10000 - slippageBps)) / BigInt(10000);
  
  // Check if native token (ETH/MATIC/etc)
  const WETH_ADDRESSES: Record<number, `0x${string}`> = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    10: '0x4200000000000000000000000000000000000006',
    137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    8453: '0x4200000000000000000000000000000000000006',
  };
  
  const wethAddress = WETH_ADDRESSES[chainId];
  const isNativeInput = route.fromToken.address.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
                        route.fromToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const isNativeOutput = route.toToken.address.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
                          route.toToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  
  // Router ABI
  const routerABI = [
    {
      inputs: [
        { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
        { internalType: 'address[]', name: 'path', type: 'address[]' },
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      ],
      name: 'swapExactTokensForTokens',
      outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
        { internalType: 'address[]', name: 'path', type: 'address[]' },
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      ],
      name: 'swapExactETHForTokens',
      outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
        { internalType: 'address[]', name: 'path', type: 'address[]' },
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      ],
      name: 'swapExactTokensForETH',
      outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  
  let hash: `0x${string}`;
  
  if (isNativeInput) {
    // Swap ETH for tokens
    hash = await walletClient.writeContract({
      address: routerAddress,
      abi: routerABI,
      functionName: 'swapExactETHForTokens',
      args: [minAmountOut, path, walletAddress as `0x${string}`, BigInt(deadline)],
      value: amountIn,
    });
  } else if (isNativeOutput) {
    // Swap tokens for ETH
    // First approve token spending
    const { getAddress } = await import('viem');
    const tokenAddress = getAddress(route.fromToken.address);
    
    // Approve router to spend tokens
    const erc20ABI = [
      {
        inputs: [
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;
    
    await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20ABI,
      functionName: 'approve',
      args: [routerAddress, amountIn],
    });
    
    // Wait a bit for approval
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Execute swap
    hash = await walletClient.writeContract({
      address: routerAddress,
      abi: routerABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, minAmountOut, path, walletAddress as `0x${string}`, BigInt(deadline)],
    });
  } else {
    // Swap tokens for tokens
    // First approve token spending
    const { getAddress } = await import('viem');
    const tokenAddress = getAddress(route.fromToken.address);
    
    // Approve router to spend tokens
    const erc20ABI = [
      {
        inputs: [
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;
    
    await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20ABI,
      functionName: 'approve',
      args: [routerAddress, amountIn],
    });
    
    // Wait a bit for approval
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Execute swap
    hash = await walletClient.writeContract({
      address: routerAddress,
      abi: routerABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, minAmountOut, path, walletAddress as `0x${string}`, BigInt(deadline)],
    });
  }
  
  // Wait for transaction confirmation
  const { getPublicClient } = await import('@/lib/wallet/utils/transfer');
  const publicClient = getPublicClient(chainId);
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash,
    timeout: 120000,
  });
  
  if (receipt.status === 'reverted') {
    throw new Error('Swap transaction reverted');
  }
  
  return {
    success: true,
    transactionHash: hash,
  };
}

/**
 * Execute PancakeSwap swap (same as Uniswap, different router address)
 */
async function executePancakeSwapSwap(
  route: RouterRoute,
  walletClient: any,
  chainId: number
): Promise<SwapExecutionResult> {
  // PancakeSwap V2 Router addresses
  const PANCAKESWAP_V2_ROUTER: Record<number, `0x${string}`> = {
    56: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    42161: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    10: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    137: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    8453: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
  };
  
  const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    throw new Error(`PancakeSwap router not found for chain ${chainId}`);
  }
  
  // Use same execution logic as Uniswap (they use same ABI)
  return await executeUniswapSwap(route, walletClient, chainId);
}

