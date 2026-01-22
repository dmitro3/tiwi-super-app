/**
 * Supported wallets configuration
 */

export type SupportedChain = 'ethereum' | 'solana';

export interface SupportedWallet {
  id: string;
  name: string;
  icon: string;
  supportedChains: SupportedChain[];
  detectionKeys: string[];
  installUrl?: string;
  description?: string;
  walletConnectId?: string;
  imageId?: string;
}

export const SUPPORTED_WALLETS: SupportedWallet[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🔗',
    supportedChains: ['ethereum'],
    detectionKeys: ['ethereum.isMetaMask', 'window.ethereum.isMetaMask'],
    installUrl: 'https://metamask.io/',
    walletConnectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    imageId: 'eebe4a7f-7166-402f-92e0-1f64ca2aa800'
  },
  {
    id: 'rabby',
    name: 'Rabby',
    icon: '🔗',
    supportedChains: ['ethereum'],
    detectionKeys: ['ethereum.isRabby', 'window.rabby'],
    installUrl: 'https://rabby.io/',
    walletConnectId: '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1',
    imageId: '255e6ba2-8dfd-43ad-e88e-57cbb98f6800'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['phantom', 'window.phantom'],
    installUrl: 'https://phantom.app/',
    walletConnectId: 'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
    imageId: 'b6ec7b81-bb4f-427d-e290-7631e6e50d00'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '🔗',
    supportedChains: ['solana'],
    detectionKeys: ['solflare', 'window.solflare', 'solana.isSolflare'],
    installUrl: 'https://solflare.com/',
    walletConnectId: '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79',
    imageId: '34c0e38d-66c4-470e-1aed-a6fabe2d1e00'
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '🔗',
    supportedChains: ['ethereum'],
    detectionKeys: ['okxwallet', 'window.okxwallet', 'ethereum.isOkxWallet'],
    installUrl: 'https://www.okx.com/web3',
    walletConnectId: '971e649544ade61d1adfaec99bb70c03ba0e2ed2883da044aaa57372a445d312',
    imageId: '94590667-cc52-4e7f-2d4b-26fcdb160100'
  }
];
