// Multi-chain wallet detection and connection utilities
import { SUPPORTED_WALLETS, type SupportedWallet } from './supported-wallets';
import { isWalletInstalled, convertToWalletProvider } from './wallet-detection-helpers';

export type WalletChain = 'ethereum' | 'solana';

export interface WalletProvider {
  id: string;
  name: string;
  icon?: string;
  supportedChains: WalletChain[];
  installed: boolean;
  imageId?: string;
}

export interface WalletAccount {
  address: string;
  chain: WalletChain;
  provider: string;
}

export const detectWalletProviders = (): WalletProvider[] => {
  const providers: WalletProvider[] = [];
  if (typeof window === 'undefined') return providers;

  for (const wallet of SUPPORTED_WALLETS) {
    const installed = isWalletInstalled(wallet);
    if (installed) {
      providers.push(convertToWalletProvider(wallet, true) as any);
    }
  }
  return providers;
};

export const getWalletForChain = async (
  providerId: string,
  chain: WalletChain
): Promise<any> => {
  if (typeof window === 'undefined') throw new Error('Window is not available');

  const win = window as any;
  switch (chain) {
    case 'solana':
      if (providerId === 'phantom' && win.phantom?.solana) return win.phantom.solana;
      if (providerId === 'solflare' && (win.solflare?.solana || win.solflare)) return win.solflare?.solana || win.solflare;
      if (win.solana) return win.solana;
      throw new Error(`Solana wallet not found for provider: ${providerId}`);

    case 'ethereum':
      if (providerId === 'phantom' && win.phantom?.ethereum) return win.phantom.ethereum;
      if (providerId === 'rabby' && win.rabby) return win.rabby;
      
      const ethereum = win.ethereum;
      if (ethereum?.providers && Array.isArray(ethereum.providers)) {
        if (providerId === 'rabby') return ethereum.providers.find((p: any) => p.isRabby);
        if (providerId === 'metamask') return ethereum.providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isOkxWallet);
      }
      
      if (ethereum) {
        if (providerId === 'rabby' && ethereum.isRabby) return ethereum;
        if (providerId === 'metamask' && ethereum.isMetaMask && !ethereum.isRabby) return ethereum;
        return ethereum;
      }
      throw new Error(`Wallet provider "${providerId}" not found`);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

export const connectWallet = async (
  providerId: string,
  chain: WalletChain
): Promise<WalletAccount> => {
  const wallet = await getWalletForChain(providerId, chain);

  try {
    switch (chain) {
      case 'solana':
        const response = await wallet.connect();
        const publicKey = response?.publicKey || wallet.publicKey;
        return {
          address: publicKey.toString(),
          chain: 'solana',
          provider: providerId,
        };

      case 'ethereum':
        const accounts = await wallet.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) throw new Error('User rejected connection');
        return {
          address: accounts[0],
          chain: chain,
          provider: providerId,
        };

      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  } catch (error: any) {
    if (error.code === 4001) throw new Error('User rejected the connection request');
    throw error;
  }
};
