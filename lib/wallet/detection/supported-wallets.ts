/**
 * Supported wallets configuration
 * Only wallets that support ERC20 (Ethereum) and/or SOL (Solana) tokens are included
 * All wallets are from WalletConnect Explorer API to ensure icon availability
 */

export type SupportedChain = 'ethereum' | 'solana';

export interface SupportedWallet {
  id: string;
  name: string;
  icon: string;
  supportedChains: SupportedChain[];
  detectionKeys: string[]; // Properties to check for wallet detection
  installUrl?: string; // Link to install the wallet
  description?: string;
  walletConnectId?: string; // WalletConnect Explorer ID
  imageId?: string; // WalletConnect image ID for icon fetching
}

/**
 * List of 100 most popular supported wallets for ERC20 and SOL tokens
 * All wallets are from WalletConnect Explorer API (2024-2025)
 * This ensures all wallets have icons available via WalletConnect Explorer
 */
export const SUPPORTED_WALLETS: SupportedWallet[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🔗',
    supportedChains: ['ethereum'],
    detectionKeys: ['ethereum.isMetaMask', 'window.ethereum.isMetaMask'],
    installUrl: 'https://metamask.io/',
    description: 'Whether you are an experienced user or brand new to blockchain, MetaMask helps you connect to the decentralized web: a new internet.',
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
    description: 'The game-changing wallet for Ethereum and all EVM chains',
    walletConnectId: '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1',
    imageId: '255e6ba2-8dfd-43ad-e88e-57cbb98f6800'
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    icon: '🔗',
    supportedChains: ['solana'],
    detectionKeys: ['jupiter', 'window.jupiter', 'solana.isJupiter'],
    installUrl: 'https://jup.ag/mobile',
    description: 'Jupiter Mobile: Best Mobile Swap in Crypto',
    walletConnectId: '0ef262ca2a56b88d179c93a21383fee4e135bd7bc6680e5c2356ff8e38301037',
    imageId: '7601bec3-144f-4c9d-30a1-2d4a372ede00'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['phantom', 'window.phantom'],
    installUrl: 'https://phantom.app/',
    description: 'Phantom makes it safe & easy for you to store, buy, send, receive, swap tokens and collect NFTs on the Solana blockchain.',
    walletConnectId: 'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
    imageId: 'b6ec7b81-bb4f-427d-e290-7631e6e50d00'
  },
  {
    id: 'trust-wallet',
    name: 'Trust Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ethereum.isTrust', 'ethereum.isTrustWallet', 'window.trustwallet', 'window.trustWallet'],
    installUrl: 'https://trustwallet.com/',
    description: 'Trust Wallet supports over 10 Million tokens including Ethereum, Solana, Polygon Matic, BNB, and Avalanche.',
    walletConnectId: '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    imageId: '7677b54f-3486-46e2-4e37-bf8747814f00'
  },
  {
    id: 'base-formerly-coinbase-wallet',
    name: 'Base (formerly Coinbase Wallet)',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['base(formerlycoinbasewallet)', 'window.base(formerlycoinbasewallet)', 'ethereum.isBase(formerlyCoinbaseWallet)', 'solana.isBase(formerlyCoinbaseWallet)'],
    installUrl: 'https://base.app',
    description: 'It pays to be here. Create, trade and earn all in one place.',
    walletConnectId: 'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    imageId: '04c88bf0-f115-4686-8c29-90a3d018a400'
  },
  {
    id: 'ledger-live',
    name: 'Ledger Live',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ledgerlive', 'window.ledgerlive', 'ethereum.isLedgerLive', 'solana.isLedgerLive'],
    installUrl: 'https://www.ledger.com/ledger-live',
    description: 'Web3 Wallet from the company that produced the world\'s most secure crypto hardware device.',
    walletConnectId: '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927',
    imageId: 'a7f416de-aa03-4c5e-3280-ab49269aef00'
  },
  {
    id: 'edge',
    name: 'Edge',
    icon: '🔗',
    supportedChains: ['ethereum'],
    detectionKeys: ['edge', 'window.edge', 'ethereum.isEdge'],
    installUrl: 'https://edge.app/',
    description: 'A powerful and easy to use wallet allowing easy control their own private keys with the familiarity and ease of mobile banking.',
    walletConnectId: '7faed13451e675679e2af297c492914ee4fda540fc82d2993a91e1d73c64d96b',
    imageId: 'f0261e29-4981-4e16-4441-165e2d5d6300'
  },
  {
    id: 'trezor-suite',
    name: 'Trezor Suite',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['trezorsuite', 'window.trezorsuite', 'ethereum.isTrezorSuite', 'solana.isTrezorSuite'],
    installUrl: 'https://trezor.io/trezor-suite',
    description: 'Trezor Suite is the companion app for the Trezor hardware wallet',
    walletConnectId: '6b0182d679b72eb2733dec38d9dee70551cc16a6ce5e7a7f4155ffb6f493c521',
    imageId: '3816cd81-6f38-4fa1-7900-f451a1727300'
  },
  {
    id: 'rezor',
    name: 'Rezor',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['rezor', 'window.rezor', 'ethereum.isRezor', 'solana.isRezor'],
    installUrl: 'https://www.rezor.org/',
    description: 'Rezor is a cutting-edge, non-custodial crypto wallet.',
    walletConnectId: 'b248559bff6b18d0d776a23698990641f8d7704c35faa7de60865cc8429818b9',
    imageId: '0239b3e4-2c96-4045-d7f1-390a1ffc7e00'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '🔗',
    supportedChains: ['solana'],
    detectionKeys: ['solflare', 'window.solflare', 'solana.isSolflare'],
    installUrl: 'https://solflare.com/',
    description: 'Solflare is the safest way to start exploring Solana. Buy, store, swap tokens & NFTs and access Solana DeFi from web or mobile.',
    walletConnectId: '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79',
    imageId: '34c0e38d-66c4-470e-1aed-a6fabe2d1e00'
  },
  {
    id: 'backpack',
    name: 'Backpack',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['backpack', 'window.backpack'],
    installUrl: 'https://backpack.app',
    description: 'Backpack Wallet',
    walletConnectId: '2bd8c14e035c2d48f184aaa168559e86b0e3433228d3c4075900a221785019b0',
    imageId: '71ca9daf-a31e-4d2a-fd01-f5dc2dc66900'
  },
  {
    id: '1inch-wallet',
    name: '1inch Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['inch', 'window.oneInch'],
    installUrl: 'http://wallet.1inch.io',
    description: '1inch Wallet - the DeFi wallet app that puts you in control. With 1inch Swap built-in, scam protection and pro-level efficiency features, 1inch Wallet brings you everything you need to run crypto from your pocket.',
    walletConnectId: 'c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576',
    imageId: '3e60118c-b9a9-43df-7975-33ebc8014400'
  },
  {
    id: 'abwallet',
    name: 'ABWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['abwallet', 'window.abwallet', 'ethereum.isABWallet', 'solana.isABWallet'],
    installUrl: 'https://ab.org/abwallet',
    description: '安全易用，一站式極速交易與資產管理工具。',
    walletConnectId: 'c36b25db7e48aa7ca19acbae35f79d6486b694f4d12def467592daa78c4cd5b7',
    imageId: 'c2cb1d47-305e-45da-cdb8-b55b73ea4300'
  },
  {
    id: 'alicebob-wallet',
    name: 'Alicebob Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['alicebobwallet', 'window.alicebobwallet', 'ethereum.isAlicebobWallet', 'solana.isAlicebobWallet'],
    installUrl: 'https://alicebob.com/',
    description: 'Securely store, buy Bitcoin & altcoins with cards, trade 1000+ cryptos on CEX & DEX, track Bitcoin price, and more!',
    walletConnectId: 'd50cc807305f886f712206c9a8a7e47a776a266a7367bc080fe8ce939fcfa2b8',
    imageId: '15be8ddd-0bef-4948-56d1-6101347a6b00'
  },
  {
    id: 'anchorage-digital-',
    name: 'Anchorage Digital ',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['anchoragedigital', 'window.anchoragedigital', 'ethereum.isAnchorageDigital', 'solana.isAnchorageDigital'],
    installUrl: 'https://www.anchorage.com/',
    description: 'Anchorage Digital & Porto by Anchorage Digital ',
    walletConnectId: '82e648053152b18d863d85a467c0ba20bde86e892eb6189e47e260bb78c1e653',
    imageId: 'f2eb2b7a-4d75-41ec-c401-179d0372d600'
  },
  {
    id: 'arculus-wallet',
    name: 'Arculus Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['arculuswallet', 'window.arculuswallet', 'ethereum.isArculusWallet', 'solana.isArculusWallet'],
    installUrl: 'https://www.arculus.co',
    description: 'Cold Storage Crypto Wallet',
    walletConnectId: '0e4915107da5b3408b38e248f7a710f4529d54cd30e9d12ff0eb886d45c18e92',
    imageId: 'f78dab27-7165-4a3d-fdb1-fcff06c0a700'
  },
  {
    id: 'atomic-wallet',
    name: 'Atomic Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['atomic', 'window.atomic'],
    installUrl: 'https://atomicwallet.io',
    description: 'Atomic Wallet – Secure, non-custodial wallet for BTC, ETH, USDT & 1000+ assets. Full control, swap & stake easily! ',
    walletConnectId: '380efff687c7d2222d62378c588d45d2e0ff40a0fc4d8f778c4d6fbe58cec5ed',
    imageId: '7eca0311-abf5-4902-43e9-51858403e200'
  },
  {
    id: 'beewallet',
    name: 'BeeWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['beewallet', 'window.beewallet', 'ethereum.isBeeWallet', 'solana.isBeeWallet'],
    installUrl: 'https://www.bee.com/en',
    description: 'Web3 wallet from BeeDAO, your bridge for entering Metaverse.',
    walletConnectId: 'e1882224c4c09a84575c533867d434267c46384f5a365b889605d28b061747c4',
    imageId: '77743ed9-5ac6-48f7-867d-0f98e481b500'
  },
  {
    id: 'best-wallet',
    name: 'Best Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['bestwallet', 'window.bestwallet', 'ethereum.isBestWallet', 'solana.isBestWallet'],
    installUrl: 'https://bestwallet.com/',
    description: 'The best independent crypto wallet\n',
    walletConnectId: 'fe68cea63541aa53ce020de7398968566dfe8f3725663a564cac89490247ed49',
    imageId: '7f9574ed-eb42-4e04-0888-be2939936700'
  },
  {
    id: 'billion-wallet',
    name: 'Billion Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['billionwallet', 'window.billionwallet', 'ethereum.isBillionWallet', 'solana.isBillionWallet'],
    installUrl: 'https://billionwallet.io/',
    description: 'Billion is your secure and fast self-custody wallet for crypto and NFTs. Store, swap, buy, sell, stake, and manage your assets with minimal fees and maximum security.',
    walletConnectId: '34af9f895e03259fb008e8ff4ea5ca5d75fcfcb606ec563c332004f39ab47803',
    imageId: 'b530c52a-1b19-4184-18f9-f0d292b88a00'
  },
  
  {
    id: 'bitget-wallet',
    name: 'Bitget Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['bitgetwallet', 'window.bitgetwallet', 'ethereum.isBitgetWallet', 'solana.isBitgetWallet'],
    installUrl: 'https://web3.bitget.com',
    description: 'Bitget Wallet',
    walletConnectId: '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
    imageId: '2b569b7f-e6c6-4faa-8e5a-ecd4dec8cf00'
  },
  {
    id: 'bitnovo-wallet',
    name: 'Bitnovo Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['bitnovowallet', 'window.bitnovowallet', 'ethereum.isBitnovoWallet', 'solana.isBitnovoWallet'],
    installUrl: 'https://bitnovo.com',
    description: 'Dive into the world of Web3 with Bitnovo Wallet. Buy, sell, and store your crypto securely. Join the revolution!  ',
    walletConnectId: 'ee789e749e9af71b1a57a78d9066085d1da1eedbcfd221100963f10cc8452cd6',
    imageId: 'c22b2af0-15a0-4e35-3417-1378b8239100'
  },
  {
    id: 'blanq',
    name: 'Blanq',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['blanq', 'window.blanq', 'ethereum.isBlanq', 'solana.isBlanq'],
    installUrl: 'https://www.blanqlabs.com',
    description: 'The first distributed-key hardware wallet',
    walletConnectId: 'c3d4800aeb5eb7b00dd5e97247993461df84e6630cc3a89bdf2ca522f0ec07d1',
    imageId: 'd02dcb81-d279-4414-627a-681dcad51200'
  },
  {
    id: 'blockchaincom',
    name: 'Blockchain.com',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['blockchain.com', 'window.blockchain.com', 'ethereum.isBlockchain.com', 'solana.isBlockchain.com'],
    installUrl: 'https://login.blockchain.com/auth/signup',
    description: 'The only crypto app you’ll ever need. Buy, store, and do more with your crypto.',
    walletConnectId: '84b43e8ddfcd18e5fcb5d21e7277733f9cccef76f7d92c836d0e481db0c70c04',
    imageId: '6f913b80-86c0-46f9-61ca-cc90a1805900'
  },
  {
    id: 'brave-wallet',
    name: 'Brave Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ethereum.isBraveWallet'],
    installUrl: 'https://brave.com/wallet/',
    description: 'The secure multi-chain crypto wallet',
    walletConnectId: '163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3',
    imageId: '8cecad66-73e3-46ee-f45f-01503c032f00'
  },
  {
    id: 'bron',
    name: 'Bron',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['bron', 'window.bron', 'ethereum.isBron', 'solana.isBron'],
    installUrl: 'https://bron.org',
    description: 'Bron Wallet — calm ownership without fear.',
    walletConnectId: 'd757db40fd0987092673c8c4f33398ac48bb52aa12abb027a652fb4c50b2dce0',
    imageId: 'b848f936-918c-4e1a-0a01-aaf9dd011600'
  },
  {
    id: 'burrito',
    name: 'Burrito',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['burrito', 'window.burrito', 'ethereum.isBurrito', 'solana.isBurrito'],
    installUrl: 'https://burritowallet.com',
    description: 'Let\'s wrap it up with Burrito Wallet!',
    walletConnectId: '8821748c25de9dbc4f72a691b25a6ddad9d7df12fa23333fd9c8b5fdc14cc819',
    imageId: '7eec7187-3f48-4fda-53bb-b0ad55749a00'
  },
  {
    id: 'bybit-wallet',
    name: 'Bybit Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['bybitwallet', 'window.bybitwallet', 'ethereum.isBybitWallet', 'solana.isBybitWallet'],
    installUrl: 'https://www.bybit.com/web3/',
    description: 'Bybit Wallet connects you to the world of Web3 with best-in-class reliability and security',
    walletConnectId: '15c8b91ade1a4e58f3ce4e7a0dd7f42b47db0c8df7e0d84f63eb39bcb96c4e0f',
    imageId: 'b9e64f74-0176-44fd-c603-673a45ed5b00'
  },
  {
    id: 'cake-wallet',
    name: 'Cake Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['cakewallet', 'window.cakewallet', 'ethereum.isCakeWallet', 'solana.isCakeWallet'],
    installUrl: 'https://cakewallet.com/',
    description: 'Cake Wallet allows you to safely store, exchange, and spend your Monero, Bitcoin, Ethereum, Litecoin, and Haven.',
    walletConnectId: '32caff85195f843b19e79669e63bf3f4ad97b23b3a48b65b3781c0d193a3fcae',
    imageId: 'b05af25b-fa4d-4f91-a4cb-2f8f7d544000'
  },
  {
    id: 'cogni-',
    name: 'Cogni ',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['cogni', 'window.cogni', 'ethereum.isCogni', 'solana.isCogni'],
    installUrl: 'https://www.getcogni.com/',
    description: 'Non-custodial Web 2 to Web 3',
    walletConnectId: '8bee2c65ad37240fab769ff3c9f56f94914e53c8d99087e1a805cc5ef39a44f3',
    imageId: 'b650cd08-21eb-4769-8ef9-96feb6e38e00'
  },
  {
    id: 'coin98-super-wallet',
    name: 'Coin98 Super Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['coin98superwallet', 'window.coin98superwallet', 'ethereum.isCoin98SuperWallet', 'solana.isCoin98SuperWallet'],
    installUrl: 'https://coin98.com/wallet',
    description: 'Coin98 Wallet is the #1 non-custodial, multi-chain wallet, and DeFi gateway',
    walletConnectId: '2a3c89040ac3b723a1972a33a125b1db11e258a6975d3a61252cd64e6ea5ea01',
    imageId: 'e7c6d5d0-b986-4348-de22-fc940e1aee00'
  },
  {
    id: 'coinex-wallet',
    name: 'CoinEx Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['coinexwallet', 'window.coinexwallet', 'ethereum.isCoinExWallet', 'solana.isCoinExWallet'],
    installUrl: 'https://wallet.coinex.com/en/',
    description: 'Secure & Powerful Web3 Wallet',
    walletConnectId: '4a4d5b02a47ef7f7162da22983431ee1cf8392a8d4929ed8c69d2759b24e17f0',
    imageId: '67650667-cc52-4e7f-2d4b-26fcdb160100'
  },
  {
    id: 'coinwallet',
    name: 'CoinWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['coinwallet', 'window.coinwallet', 'ethereum.isCoinWallet', 'solana.isCoinWallet'],
    installUrl: 'https://www.coinsdo.com',
    description: 'MPC-TSS HD Multichain Wallet, support mainnet and testnet, generate address based on custom derivation path, NFT, DApp, and more.',
    walletConnectId: '2ba89f94faff121a7c1091c3cea124167dc4291ebe87123620c66e0f120197cc',
    imageId: '1c0cd352-ce8e-4bcc-f91d-8763eab60b00'
  },
  {
    id: 'cold-wallet',
    name: 'Cold Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['coldwallet', 'window.coldwallet', 'ethereum.isColdWallet', 'solana.isColdWallet'],
    installUrl: 'https://coldwallet.com/',
    description: 'Cold Wallet is your all-in-one solution for managing digital assets and exploring the fascinating world of blockchain technology. ',
    walletConnectId: 'dd15a3530dc4de4c50ebb22010824c41337403efec713f1187695c72934fb94c',
    imageId: 'fa63c977-9637-4d85-960d-058da23e4300'
  },
  {
    id: 'crossmint',
    name: 'Crossmint',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['crossmint', 'window.crossmint', 'ethereum.isCrossmint', 'solana.isCrossmint'],
    installUrl: 'https://www.crossmint.com/',
    description: 'Making NFTs accessible to everyone',
    walletConnectId: '87eecbca66faef32f044fc7c66090fc668efb02e2d17dda7bf095d51dff76659',
    imageId: '8ad627ec-cbcd-4878-ec5c-3df588055200'
  },
  {
    id: 'cryptocom-onchain',
    name: 'Crypto.com Onchain',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['crypto.comonchain', 'window.crypto.comonchain', 'ethereum.isCrypto.comOnchain', 'solana.isCrypto.comOnchain'],
    installUrl: 'https://crypto.com/onchain',
    description: 'A non-custodial wallet that gives you access to a full suite of DeFi services in one place.',
    walletConnectId: 'f2436c67184f158d1beda5df53298ee84abfc367581e4505134b5bcf5f46697d',
    imageId: '88388eb4-4471-4e72-c4b4-852d496fea00'
  },
  {
    id: 'ctrl-wallet',
    name: 'Ctrl Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ctrlwallet', 'window.ctrlwallet', 'ethereum.isCtrlWallet', 'solana.isCtrlWallet'],
    installUrl: 'https://ctrl.xyz/',
    description: 'One wallet for all your crypto. The safest & easiest wallet for 2,300+ chains.',
    walletConnectId: 'f896cbca30cd6dc414712d3d6fcc2f8f7d35d5bd30e3b1fc5d60cf6c8926f98f',
    imageId: '749856b0-3f0e-4876-4d0f-27835310db00'
  },
  {
    id: 'daffione',
    name: 'DaffiOne',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['daffione', 'window.daffione', 'ethereum.isDaffiOne', 'solana.isDaffiOne'],
    installUrl: 'https://www.daffione.com/',
    description: 'Self-custody wallet, with support for various chains',
    walletConnectId: '078d94b4c8706e12fe379e85242ce963380acfd678518e2d8ea73ee532d9bacc',
    imageId: '1e87bcb9-452c-4ad7-471c-130ae0115000'
  },
  {
    id: 'digital-shield',
    name: 'Digital Shield',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['digitalshield', 'window.digitalshield', 'ethereum.isDigitalShield', 'solana.isDigitalShield'],
    installUrl: 'https://app.ds.pro',
    description: 'Digital Shield Wallet - Open Source Multi-Platform Crypto Wallet\n\nDigital Shield Wallet is a comprehensive, open-source cryptocurrency wallet that provides secure and user-friendly access to the decentralized ecosystem. Built with cutting-edge technology, our wallet supports multiple platforms including mobile (iOS/Android), desktop (macOS/Windows/Linux), and browser extensions.\n\nKey Features:\n\n- 🔒 Security First : Advanced encryption and secure backup mechanisms\n- 🌐 Multi-Chain Support : Comp',
    walletConnectId: '6ccad459120e00737c6001a576e62867ea68b74388278de2c62deddc86f356f6',
    imageId: '020fe815-8a77-4a7b-b292-b69372e12500'
  },
  {
    id: 'dlicom',
    name: 'DLICOM',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['dlicom', 'window.dlicom', 'ethereum.isDLICOM', 'solana.isDLICOM'],
    installUrl: 'https://dlicom.io',
    description: 'Dlicom is a next gen app merging DeFi and social media. Manage self custody crypto & NFTs, in app swaps, and gas paid with Dlicom tokens. Use a decentralized browser for dApps, swap, stake, bridge. Stake to earn USDT; create, share, tip, and monetize content; encrypted messaging with P2P payments. Personalized ads, boosted posts, and premium tools (portfolio tracking, multiwallets). Secure, private, and user friendly.',
    walletConnectId: '71ba37d08c477ba46d681022a574544b742f66fbe51383b422a916456960c123',
    imageId: '07e4552b-d5c7-4ef1-1219-0ebd9f42d600'
  },
  {
    id: 'dokwallet',
    name: 'Dokwallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['dokwallet', 'window.dokwallet', 'ethereum.isDokwallet', 'solana.isDokwallet'],
    installUrl: 'https://www.dokwallet.com',
    description: 'Non-cutodial crypto wallet',
    walletConnectId: 'a77eaf6509774b780b22f678fa15168c4e12f71f7eb3102edf85112a222bb503',
    imageId: '5707f35e-17a1-42b3-35c5-664f7655cd00'
  },
  {
    id: 'ecoin-wallet',
    name: 'ECOIN Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ecoinwallet', 'window.ecoinwallet', 'ethereum.isECOINWallet', 'solana.isECOINWallet'],
    installUrl: 'https://ecoinwallet.org',
    description: 'User-friendly crypto wallet for Android with One UI 6, supporting Bitcoin, Ethereum, Solana, BNB Chain, Polygon, ZetaChain, Base and more.',
    walletConnectId: '297bf3864322ce81262df9a40b9a0fdcb504e737ad900bfe8ef47710729456ce',
    imageId: '9639c263-d590-4862-ba9f-d5c7c1878d00'
  },
  {
    id: 'exodus',
    name: 'Exodus',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['exodus', 'window.exodus'],
    installUrl: 'https://exodus.com/',
    description: 'Best Crypto Wallet for Desktop, Mobile, Browser, Hardware',
    walletConnectId: 'e9ff15be73584489ca4a66f64d32c4537711797e30b6660dbcb71ea72a42b1f4',
    imageId: '4c16cad4-cac9-4643-6726-c696efaf5200'
  },
  {
    id: 'fireblocks',
    name: 'Fireblocks',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['fireblocks', 'window.fireblocks', 'ethereum.isFireblocks', 'solana.isFireblocks'],
    installUrl: 'https://www.fireblocks.com/',
    description: '#1 Crypto and Digital Asset Platform for Institutions',
    walletConnectId: '5864e2ced7c293ed18ac35e0db085c09ed567d67346ccb6f58a0327a75137489',
    imageId: '7e1514ba-932d-415d-1bdb-bccb6c2cbc00'
  },
  {
    id: 'fizen-wallet',
    name: 'Fizen Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['fizenwallet', 'window.fizenwallet', 'ethereum.isFizenWallet', 'solana.isFizenWallet'],
    installUrl: 'https://fizen.io',
    description: 'Fizen Super App for Crypto Spending - The Bridge Between Your Crypto and Real-life Activities',
    walletConnectId: '17a4ec96ceb34ade8e5215220df2051614aeebb832cc80ef19ddd7f33d5ba862',
    imageId: '1160bfa2-b669-42ba-b224-13edcd40c700'
  },
  {
    id: 'flash-wallet',
    name: 'Flash Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['flashwallet', 'window.flashwallet', 'ethereum.isFlashWallet', 'solana.isFlashWallet'],
    installUrl: 'https://flash-wallet.com/',
    description: 'Flash Wallet is a fast, secure wallet for managing crypto assets, supporting token transactions, real-time tracking, and NFT integration.',
    walletConnectId: 'c18e114130f221c8960e75bfa4b86478e70e27465e2d6b22ac8945c08a031a7e',
    imageId: 'ded6d2d1-85b0-4eac-5582-3aaeefa8ba00'
  },
  {
    id: 'flutter-sample-wallet',
    name: 'Flutter Sample Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['fluttersamplewallet', 'window.fluttersamplewallet', 'ethereum.isFlutterSampleWallet', 'solana.isFlutterSampleWallet'],
    installUrl: 'https://appkit-lab.reown.com/flutter_walletkit',
    description: 'Flutter Sample Wallet Internal powered with Reown WalletKit',
    walletConnectId: 'c16e0e172fe80ebdc26bcdc9d24d962b7a9474b6db8ce9e6b2022e86195728cd',
    imageId: 'db10ede4-39c3-48ff-f85b-de9b5f17d000'
  },
  {
    id: 'frontier',
    name: 'Frontier',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ethereum.isFrontier'],
    installUrl: 'https://www.frontier.xyz',
    description: 'The unified non-custodial wallet to Send, Stake, Swap, Bridge Crypto & NFTs. Interact with DeFi apps, 50+ Blockchains & ecosystems.',
    walletConnectId: '85db431492aa2e8672e93f4ea7acf10c88b97b867b0d373107af63dc4880f041',
    imageId: 'a78c4d48-32c1-4a9d-52f2-ec7ee08ce200'
  },
  {
    id: 'gaya-wallet',
    name: 'Gaya Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['gayawallet', 'window.gayawallet', 'ethereum.isGayaWallet', 'solana.isGayaWallet'],
    installUrl: 'https://gayawallet.com',
    description: 'Gaya Wallet is a secure, non-custodial multichain wallet for Solana & Ethereum. Manage assets, swap tokens, and stay in full control.',
    walletConnectId: '2c69b45f625add0acd3354df4ab757067143b7f54b937311966f55be60a89c41',
    imageId: '67e7c918-8cf2-4781-0a10-e7e6f4c48900'
  },
  {
    id: 'gem-wallet',
    name: 'Gem Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['gemwallet', 'window.gemwallet', 'ethereum.isGemWallet', 'solana.isGemWallet'],
    installUrl: 'https://gemwallet.com',
    description: 'Friendly Crypto Wallet.',
    walletConnectId: 'dcb5cd7bb4a8849288f8b43dea7bf20d7b7e2b096b630964f9ca5bf808531edd',
    imageId: '28f1b431-9d2a-4083-1bf8-5958939a2300'
  },
  {
    id: 'gk8',
    name: 'GK8',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['gk8', 'window.gk8', 'ethereum.isGK8', 'solana.isGK8'],
    installUrl: 'https://www.gk8.io/',
    description: 'GK8, a Galaxy company and the sole provider of Impenetrable Custody, safeguards the most valuable asset a financial institution has—trust—by enabling financial institutions to provide digital assets that are 100% unstealable.',
    walletConnectId: 'a5f729636bd307a509e8814d8553d224550e4c35fee2b4e2f71bb1ade63ee4a9',
    imageId: '48bfe152-7f96-4e9b-3f94-8c6b6b484b00'
  },
  {
    id: 'gridlock-wallet',
    name: 'Gridlock Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['gridlockwallet', 'window.gridlockwallet', 'ethereum.isGridlockWallet', 'solana.isGridlockWallet'],
    installUrl: 'https://gridlock.network/',
    description: 'Gridlock enables safely navigating Web3, NFT trading and storage, purchasing crypto, and leveraging maximum security with crypto Guardians.',
    walletConnectId: '8631ca765defdf51cd72444ec0284b866c835a947ed082d41c0c756a3b2eb1c2',
    imageId: '471e6f61-b95a-453c-670c-029ef3b2bd00'
  },
  {
    id: 'hb-wallet',
    name: 'HB WALLET',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['hbwallet', 'window.hbwallet', 'ethereum.isHBWALLET', 'solana.isHBWALLET'],
    installUrl: 'https://hbwallet.app',
    description: 'You can interact instantly and directly with Dapps on Ethereum (ETH), Binance Smart Chain (BSC), and all custom chains from HB WALLET.',
    walletConnectId: '2125ab6a3e8be0d73e6d48f9db39c34925a790a631b4b67b84502d823aa47ad3',
    imageId: 'f134f8a2-cf58-44dd-7626-dc2cd21a3800'
  },
  {
    id: 'hero-wallet',
    name: 'Hero Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['herowallet', 'window.herowallet', 'ethereum.isHeroWallet', 'solana.isHeroWallet'],
    installUrl: 'https://wallet.hero.io',
    description: 'Hero wallet is a multichain web3 wallet. ',
    walletConnectId: 'a1f3f8956346e2ba29e25bc5252c6dc0b2afa9ee17aa13ecd026abafedaf8696',
    imageId: '974f0728-7c62-4772-b66b-6b83ced7f200'
  },
  {
    id: 'hootark',
    name: 'HootArk',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['hootark', 'window.hootark', 'ethereum.isHootArk', 'solana.isHootArk'],
    installUrl: 'https://www.hootark.com/',
    description: 'A built-in multi-chain wallet in a browser',
    walletConnectId: '2225e93edb4eda791e19e26817b94976607132bdb248684a39a5fc5ac9103782',
    imageId: 'c5f74b15-89cc-4f1f-8387-d3ffeb7a3400'
  },
  {
    id: 'hot-wallet',
    name: 'HOT Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['hotwallet', 'window.hotwallet', 'ethereum.isHOTWallet', 'solana.isHOTWallet'],
    installUrl: 'https://hot-labs.org/wallet',
    description: 'Multi-chain Wallet with MPC Protocol',
    walletConnectId: 'aee5083aac025c4c3f1c9afc31ea89dbddca0b1c248195bef469fc4886ae3ab2',
    imageId: '809867ce-345f-4180-033a-165019d4c700'
  },
  {
    id: 'ibvm-wallet',
    name: 'IBVM Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ibvmwallet', 'window.ibvmwallet', 'ethereum.isIBVMWallet', 'solana.isIBVMWallet'],
    installUrl: 'https://ibvm.io/',
    description: 'IBVM Wallet is the official crypto wallet of International Bitcoin Virtual Machine.',
    walletConnectId: 'fea98faf8b5ae216c1091bb33dfc41ee27278059b871bf1d5b1b7af3744eca72',
    imageId: 'a9b8d4c4-b6e1-4b2e-15c3-81331511c400'
  },
  {
    id: 'iopay',
    name: 'ioPay',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['iopay', 'window.iopay', 'ethereum.isioPay', 'solana.isioPay'],
    installUrl: 'https://iopay.me/',
    description: 'Multi-Chain Crypto Wallet. Supports IoTeX, Ethereum, BNB Chain, Polygon.',
    walletConnectId: '1a5f2435e8e31c4034f1d142e85d9f7d3be2a09ddf710e5ef1ad4e36c719d3c0',
    imageId: '411d80d0-3a75-4932-560f-565d8c715e00'
  },
  {
    id: 'itoken-wallet',
    name: 'iToken Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['itokenwallet', 'window.itokenwallet', 'ethereum.isiTokenWallet', 'solana.isiTokenWallet'],
    installUrl: 'https://www.itoken.com/',
    description: 'For and from those who place top priority on asset security.',
    walletConnectId: '797c615e2c556b610c048eb35535f212c0dd58de5d03e763120e90a7d1350a77',
    imageId: '5cd60c34-038d-470c-c024-d58f64260200'
  },
  {
    id: 'keyring-pro',
    name: 'KEYRING PRO',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['keyringpro', 'window.keyringpro', 'ethereum.isKEYRINGPRO', 'solana.isKEYRINGPRO'],
    installUrl: 'https://keyring.app/',
    description: 'KEYRING PRO brings possibilities to reality by offering a simple cross-chain environment, where user can experience multiple chains at once.',
    walletConnectId: '47bb07617af518642f3413a201ec5859faa63acb1dd175ca95085d35d38afb83',
    imageId: 'dda0f0fb-34e8-4a57-dcea-b008e7d1ff00'
  },
  {
    id: 'klever-wallet',
    name: 'Klever Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['kleverwallet', 'window.kleverwallet', 'ethereum.isKleverWallet', 'solana.isKleverWallet'],
    installUrl: 'https://klever.io/',
    description: 'Klever Wallet is a secure multi-chain web-3 wallet. Store BTC and +10,000 crypto assets in one place.',
    walletConnectId: 'fbea6f68df4e6ce163c144df86da89f24cb244f19b53903e26aea9ab7de6393c',
    imageId: '2e181ba3-bf6f-4599-5349-f7409bc62100'
  },
  {
    id: 'klip',
    name: 'Klip',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['klip', 'window.klip', 'ethereum.isKlip', 'solana.isKlip'],
    installUrl: 'https://klipwallet.com/',
    description: 'Klip for WalletConnect',
    walletConnectId: '3c2c985c0adff6f46a0d0e466b3924ed8a059043882cd1944ad7f2adf697ed54',
    imageId: 'f7b6b2a6-ebe7-4779-6ad1-79a3142e6b00'
  },
  {
    id: 'kotlin-sample-internal-wallet',
    name: 'Kotlin Sample Internal Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['kotlinsampleinternalwallet', 'window.kotlinsampleinternalwallet', 'ethereum.isKotlinSampleInternalWallet', 'solana.isKotlinSampleInternalWallet'],
    installUrl: 'https://docs.reown.com/walletkit/android/installation',
    description: 'Kotlin Sample Wallet',
    walletConnectId: '7f3449afd0516845236c4f15f73cf3e106cb5706a349a8d6d7e1490b9c2cb0da',
    imageId: '2e3866ec-a700-48a2-2db8-7c6af6481900'
  },
  {
    id: 'kraken-wallet-',
    name: 'Kraken Wallet ',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['krakenwallet', 'window.krakenwallet', 'ethereum.isKrakenWallet', 'solana.isKrakenWallet'],
    installUrl: 'https://www.kraken.com/wallet',
    description: 'Kraken Wallet is a powerful self-custody wallet built to connect you to the decentralized web — safely and securely.',
    walletConnectId: '18450873727504ae9315a084fa7624b5297d2fe5880f0982979c17345a138277',
    imageId: '8909e826-63e4-42b3-60b2-8a6a54060900'
  },
  {
    id: 'kucoin-web3-wallet',
    name: 'KuCoin Web3 Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['kucoinweb3wallet', 'window.kucoinweb3wallet', 'ethereum.isKuCoinWeb3Wallet', 'solana.isKuCoinWeb3Wallet'],
    installUrl: 'https://www.kucoin.com/Web3',
    description: 'Find the Next Crypto Gem',
    walletConnectId: '67f1ec404dbf3bddc509b5fcf615850e05b28c287ccd7167b4fe81b4293ac9df',
    imageId: '70d8a90b-457b-4c04-4bc3-791e97caab00'
  },
  {
    id: 'magic-eden',
    name: 'Magic Eden',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['magiceden', 'window.magiceden', 'ethereum.isMagicEden', 'solana.isMagicEden'],
    installUrl: 'https://wallet.magiceden.io/',
    description: 'Magic Eden Wallet',
    walletConnectId: '8b830a2b724a9c3fbab63af6f55ed29c9dfa8a55e732dc88c80a196a2ba136c6',
    imageId: '62040f22-2ffd-4942-92fc-71ce68c64300'
  },
  {
    id: 'mathwallet',
    name: 'MathWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ethereum.isMathWallet'],
    installUrl: 'https://mathwallet.org/',
    description: 'The Multichain Wallet for Web3',
    walletConnectId: '7674bb4e353bf52886768a3ddc2a4562ce2f4191c80831291218ebd90f5f5e26',
    imageId: '26a8f588-3231-4411-60ce-5bb6b805a700'
  },
  {
    id: 'maxwallet',
    name: 'MaxWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['maxwallet', 'window.maxwallet', 'ethereum.isMaxWallet', 'solana.isMaxWallet'],
    installUrl: 'https://maxwallet.cc',
    description: 'Store, buy, exchange and stake crypto in a secured mobile and desktop app. 40+ blockchains and thousands of tokens available.',
    walletConnectId: '0db9b539a5e519dab9097250f5abb6f0b2a11c2e17dee313b650401e089945b8',
    imageId: '2f6e63fb-6443-4ac9-5978-85d61defb600'
  },
  {
    id: 'mirai-app',
    name: 'Mirai App',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['miraiapp', 'window.miraiapp', 'ethereum.isMiraiApp', 'solana.isMiraiApp'],
    installUrl: 'https://miraiapp.io',
    description: 'Mirai App is your trusted partner for navigating the dynamic world of digital assets with the MPC technology.',
    walletConnectId: '66a1b8d00aa8da714ae07a123a565f6226c44156a54ed04ffc6ee5ffe1f56e64',
    imageId: '0c8022b0-d5a3-4561-64d5-a3e60d1ed500'
  },
  {
    id: 'mixin-messenger',
    name: 'Mixin Messenger',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['mixinmessenger', 'window.mixinmessenger', 'ethereum.isMixinMessenger', 'solana.isMixinMessenger'],
    installUrl: 'https://messenger.mixin.one',
    description: 'Web3 Wallet',
    walletConnectId: '9be416fd7b5a20dfe115930b759e9a69a5dd6299b42f3eab0f3f70ee6ac5331f',
    imageId: 'c5516ab5-57c3-45ec-09e2-b149c9709600'
  },
  {
    id: 'nest-wallet',
    name: 'Nest Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['nestwallet', 'window.nestwallet', 'ethereum.isNestWallet', 'solana.isNestWallet'],
    installUrl: 'https://nestwallet.xyz',
    description: 'A wallet built for traders.',
    walletConnectId: 'df1d89401c7320e6d62fa5bc4a516e8df21b604b10a7eedefbee9ada66b20c5d',
    imageId: '9f471f97-0b62-4af9-6198-fc9c4bd58000'
  },
  {
    id: 'newmoneyai',
    name: 'Newmoney.AI',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['newmoney.ai', 'window.newmoney.ai', 'ethereum.isNewmoney.AI', 'solana.isNewmoney.AI'],
    installUrl: 'https://newmoney.ai',
    description: 'Newmoney.AI - Easily Send & Receive Crypto & AI',
    walletConnectId: '49c61c13758b7a9f69018f06de961110a29cb0f0be4cb9cbbd4eb3a2bee3b857',
    imageId: '2736bfe5-65f6-4ca1-77bf-8b4a59f7a900'
  },
  {
    id: 'newwallet',
    name: 'NewWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['newwallet', 'window.newwallet', 'ethereum.isNewWallet', 'solana.isNewWallet'],
    installUrl: 'https://newwallet.io',
    description: 'NewWallet is a non-custodial Web3 wallet that combines simple social logins with secure WebAuthn, making crypto access easy and safe for everyone.',
    walletConnectId: 'e7f454284c99350361bfd5a1f433a999e1e841f0990f0207d48e1795722fa7a7',
    imageId: '3a97d716-19e4-45c0-8cab-61664c0f3b00'
  },
  {
    id: 'nightly',
    name: 'Nightly',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['nightly', 'window.nightly'],
    installUrl: 'https://nightly.app',
    description: 'Your favourite multichain wallet.',
    walletConnectId: '9a4cddbdbc19005be790f37cc9176dd24eae51aa2a49fa3edeb3b6a8b089b7be',
    imageId: '7fb6e288-6d7e-4f29-d934-8b3f229c2d00'
  },
  {
    id: 'nonbank',
    name: 'NonBank',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['nonbank', 'window.nonbank', 'ethereum.isNonBank', 'solana.isNonBank'],
    installUrl: 'https://nonbank.io/',
    description: 'Non-Custodial Wallet',
    walletConnectId: 'dbe30fc296ccd75fbf5bc7157fcfe23d839c0cea83c4883ab9601677e0a9a738',
    imageId: 'fe06c7ed-3df1-4cc7-9686-c920914abd00'
  },
  {
    id: 'noone-wallet',
    name: 'Noone Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['noonewallet', 'window.noonewallet', 'ethereum.isNooneWallet', 'solana.isNooneWallet'],
    installUrl: 'https://noone.io/',
    description: 'White-label non-custodial wallet. Сustomize your crypto journey with tailored features designed exclusively for your business',
    walletConnectId: 'eae2c4b9da3b33b72b20d929a6342830bf54b541665e54c3a46024118e9e0e81',
    imageId: 'fbae89d3-d6cb-4b98-bd1c-b2007b61ed00'
  },
  {
    id: 'oisy',
    name: 'OISY',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['oisy', 'window.oisy', 'ethereum.isOISY', 'solana.isOISY'],
    installUrl: 'https://oisy.com',
    description: 'A multi-chain wallet powered by chainfusion.',
    walletConnectId: '59968c4e5ef18efe3a287cb1206c41fd46d69589def8fd5c4990be92401fabcb',
    imageId: 'fd94d14c-c6a0-47a9-498a-e6df95e50f00'
  },
  {
    id: 'okx-wallet',
    name: 'OKX Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['ethereum.isOkxWallet', 'window.okxwallet'],
    installUrl: 'https://www.okx.com/download',
    description: 'One Web3 portal to rule them all',
    walletConnectId: '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1',
    imageId: 'c55df831-3c52-49fc-d1d1-97a926dc0c00'
  },
  {
    id: 'open-wallet',
    name: 'Open Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['openwallet', 'window.openwallet', 'ethereum.isOpenWallet', 'solana.isOpenWallet'],
    installUrl: 'https://openwallet.finance',
    description: 'Open Wallet isn\'t your average crypto wallet. It throws away the keys (literally) and uses advanced tech to keep your digital assets safe',
    walletConnectId: '2f0e39323be165a0972147140c7b822be17e5eb464a5e8558ac0e0ab01c48944',
    imageId: '68a3c433-d944-4bf6-5093-4ac415fd5400'
  },
  {
    id: 'plena-app',
    name: 'Plena-App',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['plena-app', 'window.plena-app', 'ethereum.isPlena-App', 'solana.isPlena-App'],
    installUrl: 'https://plena.finance',
    description: 'Invest in 100,000+ Cryptocurrencies: Send, Receive, Swap and Bridge Your Assets in a Single Tap With The First Crypto SuperApp.',
    walletConnectId: '9654c004e02e492c30904a820154e239886edbf4d66bc5d372060809ef4c9111',
    imageId: '9ba07b43-3db1-4e8d-100e-8c91d8430c00'
  },
  {
    id: 'purewallet-app',
    name: 'PureWallet app',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['purewalletapp', 'window.purewalletapp', 'ethereum.isPureWalletapp', 'solana.isPureWalletapp'],
    installUrl: 'https://purewallet.ai',
    description: 'PureWallet enables offline crypto transactions with zero fees, instant speed, and secure cold storage. Trade anywhere—no internet needed!',
    walletConnectId: '1aecb6762373f96100f941347bd554d6bdbf6c30a1368c47bf391432021d6ce9',
    imageId: '4e97b9d6-60eb-42cd-6256-5cd7205e3f00'
  },
  {
    id: 'qubeticswallet',
    name: 'QubeticsWallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['qubeticswallet', 'window.qubeticswallet', 'ethereum.isQubeticsWallet', 'solana.isQubeticsWallet'],
    installUrl: 'https://www.qubetics.com/',
    description: 'Qubetics Wallet is fully non-custodial, giving you complete control over your digital assets with no reliance on a central authority.',
    walletConnectId: '80afbf1e261cc241e8227127592879c6ebd753c7c7a0a714c75923fa76730e0c',
    imageId: 'f6afe67c-41e9-44fc-075a-3e7eda291000'
  },
  {
    id: 'safemoon',
    name: 'SafeMoon',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['safemoon', 'window.safemoon', 'ethereum.isSafeMoon', 'solana.isSafeMoon'],
    installUrl: 'https://safemoon.com/',
    description: 'A human-focused technology and innovation business expanding blockchain technologies for a brighter tomorrow.',
    walletConnectId: 'a0e04f1086aac204d4ebdd5f985c12ed226cd0006323fd8143715f9324da58d1',
    imageId: 'ea0140c7-787c-43a4-838f-d5ab6a342000'
  },
  {
    id: 'safepal',
    name: 'SafePal',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['safepal', 'window.safepal'],
    installUrl: 'https://safepal.com/',
    description: 'SafePal is a cryptocurrency wallet that aims to provide a secure and user-friendly crypto management platform for the masses. ',
    walletConnectId: '0b415a746fb9ee99cce155c2ceca0c6f6061b1dbca2d722b3ba16381d0562150',
    imageId: '252753e7-b783-4e03-7f77-d39864530900'
  },
  {
    id: 'slavi-wallet',
    name: 'Slavi Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['slaviwallet', 'window.slaviwallet', 'ethereum.isSlaviWallet', 'solana.isSlaviWallet'],
    installUrl: 'https://slavi.io/',
    description: 'Cross-chain decentralized SuperDApp with 30+ blockchains & one-click access to Web 3.0, PlayToEarn and NFT services',
    walletConnectId: 'b823fb0d7228ef8e3c0bc9607df9ed79dae2ab3a2811d33f22ade4f573c18232',
    imageId: '282ce060-0beb-4236-b7b0-1b34cc6c8f00'
  },
  {
    id: 'soc-wallet',
    name: 'SOC Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['socwallet', 'window.socwallet', 'ethereum.isSOCWallet', 'solana.isSOCWallet'],
    installUrl: 'https://socjsc.com',
    description: 'SOC Wallet',
    walletConnectId: '28b60a29a8ffd15f52a33cc0d0ee4f8b1cd234b68f554195a823bf16a40cab29',
    imageId: 'a8ccc7ce-fc3b-4326-8d5c-a2d8eb06d600'
  },
  {
    id: 'squirrel-wallet',
    name: 'Squirrel Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['squirrelwallet', 'window.squirrelwallet', 'ethereum.isSquirrelWallet', 'solana.isSquirrelWallet'],
    installUrl: 'https://www.squirrelwallet.com/',
    description: 'Squirrel Wallet is a non-custodial cryptocurrency wallet that gives users full control over their digital assets with enhanced security and usability. With a redesigned interface, social recovery via Guardians, and support for 105+ blockchains, Squirrel Wallet makes managing crypto and Web3 assets simple and secure.',
    walletConnectId: '716187d401fb156b08b222b3a624902cf06e3ab5d4dc7d7dfcc37572359e6d9d',
    imageId: '2d96f461-ff40-4118-ef09-810c45376200'
  },
  {
    id: 'strikex-wallet',
    name: 'StrikeX Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['strikexwallet', 'window.strikexwallet', 'ethereum.isStrikeXWallet', 'solana.isStrikeXWallet'],
    installUrl: 'https://tradestrike.io/',
    description: 'Buy, sell, swap, transfer & track crypto on our non-custodial DeFi Crypto wallet.',
    walletConnectId: '36dbd7f82df78f406723eb71599640fbbf703b2583682ba1e419a9098a2d4945',
    imageId: 'f81642e4-2355-454a-25f5-72e27f2c6f00'
  },
  {
    id: 'swift-sample-wallet',
    name: 'Swift Sample Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['swiftsamplewallet', 'window.swiftsamplewallet', 'ethereum.isSwiftSampleWallet', 'solana.isSwiftSampleWallet'],
    installUrl: 'https://reown.com',
    description: 'Reown Swift Sample Wallet',
    walletConnectId: 'dfa04e5a17584aa9b3a9637f10ce2e95fcd6343fb81e8c634922b21a28cc66a8',
    imageId: 'd4ef1a64-f5e3-4f11-9fe0-035e22ca6200'
  },
  {
    id: 't-wallet-',
    name: 'T+ Wallet ',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['t+wallet', 'window.t+wallet', 'ethereum.isT+Wallet', 'solana.isT+Wallet'],
    installUrl: 'https://www.talkapp.org/',
    description: 'With "Talk+", users can easily buy crypto online instantly or transfer them to friends by using its blockchain wallet feature.  ',
    walletConnectId: 'c3b76dabb8b8161b2848a4c313b559a2cd719b43732c3e0da00f345e571241e5',
    imageId: 'c08ff28f-5a52-4bf2-e63a-205905fd5800'
  },
  {
    id: 'tangem-wallet',
    name: 'Tangem Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tangemwallet', 'window.tangemwallet', 'ethereum.isTangemWallet', 'solana.isTangemWallet'],
    installUrl: 'https://tangem.com',
    description: 'Tangem is a card-shaped self-custodial cold hardware wallet which gives you full control of your private keys',
    walletConnectId: '21030f20fba1a77115858ee3a8bc5841c739ab4537441316e2f4b1d0a8d218af',
    imageId: '80679c6f-bb0b-43d0-83e0-462ac268b600'
  },
  {
    id: 'tastycrypto',
    name: 'tastycrypto',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tastycrypto', 'window.tastycrypto', 'ethereum.istastycrypto', 'solana.istastycrypto'],
    installUrl: 'https://www.tastycrypto.com/',
    description: 'Explore the endless opportunities of DeFi and Web3 through the tastycrypto self-custody wallet.',
    walletConnectId: 'e9a73053c7d8cf7f8eb732e3da6a8dfd3cc211ea4dc00e0274b9dec6e3316605',
    imageId: '357878c9-a195-4102-8f69-55eb2c578700'
  },
  {
    id: 'the-pulse-wallet',
    name: 'The Pulse Wallet',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['thepulsewallet', 'window.thepulsewallet', 'ethereum.isThePulseWallet', 'solana.isThePulseWallet'],
    installUrl: 'https://thepulsewallet.org/',
    description: 'The safest and fastest way to explore and master PulseChain. Store, manage, trade, and swap crypto and NFT anywhere anytime.',
    walletConnectId: 'a2eb8a1c403a4440b2f578e9deb185b8e22cf4ec2a2a58441032b84b13aaab87',
    imageId: '1f3d46b8-2569-4601-5084-845f7e64da00'
  },
  {
    id: 'tholos',
    name: 'Tholos',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tholos', 'window.tholos', 'ethereum.isTholos', 'solana.isTholos'],
    installUrl: 'https://tholos.app',
    description: 'User-friendly multi-signer wallet built for teams',
    walletConnectId: '21af5c7a9c01793077b61aecbb4bb5648e9be62a6a0a42c5f4d2ff05d4e00d5c',
    imageId: 'f0f306e6-2dba-4805-e7b9-4f25952e2900'
  },
  {
    id: 'tidus-wallet-',
    name: 'Tidus Wallet ',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tiduswallet', 'window.tiduswallet', 'ethereum.isTidusWallet', 'solana.isTidusWallet'],
    installUrl: 'https://tiduswallet.com/',
    description: 'Tidus Wallet is your fully decentralized gateway to DeFi and The Metaverse. ',
    walletConnectId: 'ca331388cfe708d3c0fb094f4b08fb3c7ebd7778d3dfdcecb728990e178a3d81',
    imageId: '797bd108-d862-4d1b-d339-883de9a75000'
  },
  {
    id: 'tobi',
    name: 'Tobi',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tobi', 'window.tobi', 'ethereum.isTobi', 'solana.isTobi'],
    installUrl: 'https://tobi.fun',
    description: 'The first self-custody, cross-chain web3 assistant in Telegram',
    walletConnectId: 'fa977f7d37f533bd283e44268d020c6852433f091f5373dd33ae7dc0d4522e9a',
    imageId: '3cd2d066-56f7-4272-4a98-b39b41ea8200'
  },
  {
    id: 'tokenb',
    name: 'TokenB',
    icon: '🔗',
    supportedChains: ['ethereum', 'solana'],
    detectionKeys: ['tokenb', 'window.tokenb', 'ethereum.isTokenB', 'solana.isTokenB'],
    installUrl: 'https://tokenb.com/',
    description: 'TokenB is the simplest and most secure way to store, purchase, and exchange on the Algorand blockchain. It can discover and connect decentralized applications (DApps) on any device.',
    walletConnectId: 'd64f041c77e248e6c24b791616f9bcd652fd2183dd590a1156e13ebfa0d15f74',
    imageId: '5b3fc2c1-923f-46a3-5e20-195b7f92cb00'
  }
];

/**
 * Get all wallet IDs
 */
export const getAllWalletIds = (): string[] => {
  return SUPPORTED_WALLETS.map(wallet => wallet.id);
};

/**
 * Get wallet by ID
 */
export const getWalletById = (id: string): SupportedWallet | undefined => {
  return SUPPORTED_WALLETS.find(wallet => wallet.id === id);
};

/**
 * Get wallet by WalletConnect ID
 */
export const getWalletByWalletConnectId = (walletConnectId: string): SupportedWallet | undefined => {
  return SUPPORTED_WALLETS.find(wallet => wallet.walletConnectId === walletConnectId);
};

/**
 * Check if a wallet supports a specific chain
 */
export const walletSupportsChain = (walletId: string, chain: SupportedChain): boolean => {
  const wallet = getWalletById(walletId);
  return wallet ? wallet.supportedChains.includes(chain) : false;
};
