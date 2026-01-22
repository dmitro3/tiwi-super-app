// Solana wallet adapter utilities for LiFi SDK
export interface SolanaWallet {
  publicKey: any;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const getSolanaWallet = async (): Promise<SolanaWallet | null> => {
  if (typeof window === 'undefined') return null;

  const win = window as any;
  if (win.phantom?.solana?.isPhantom) {
    const phantom = win.phantom.solana;
    if (phantom.isConnected && phantom.publicKey) {
      return {
        publicKey: phantom.publicKey,
        signTransaction: phantom.signTransaction.bind(phantom),
        signAllTransactions: phantom.signAllTransactions.bind(phantom),
        isConnected: phantom.isConnected,
        connect: phantom.connect.bind(phantom),
        disconnect: phantom.disconnect.bind(phantom),
      };
    }
  }

  if (win.solana?.isConnected && win.solana.publicKey) {
    const solana = win.solana;
    return {
      publicKey: solana.publicKey,
      signTransaction: solana.signTransaction.bind(solana),
      signAllTransactions: solana.signAllTransactions.bind(solana),
      isConnected: solana.isConnected,
      connect: solana.connect.bind(solana),
      disconnect: solana.disconnect.bind(solana),
    };
  }

  return null;
};

export const getSolanaWalletAdapterForLiFi = async (): Promise<any> => {
  const wallet = await getSolanaWallet();
  if (!wallet || !wallet.isConnected) throw new Error('Solana wallet not connected');

  const { PublicKey } = await import('@solana/web3.js');
  
  return {
    publicKey: new PublicKey(wallet.publicKey.toString()),
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    connected: wallet.isConnected,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
  };
};
