/**
 * Translation strings for the application.
 * Key structure: namespace.key (e.g., "nav.home", "common.save")
 */

export type TranslationKey =
  // Navigation
  | "nav.home"
  | "nav.market"
  | "nav.swap"
  | "nav.pool"
  | "nav.earn"
  | "nav.portfolio"
  | "nav.referral"
  | "nav.settings"
  | "nav.connect_wallet"
  | "nav.disconnect"
  | "nav.notifications"
  // Common
  | "common.apply"
  | "common.applied"
  | "common.save"
  | "common.cancel"
  | "common.close"
  | "common.search"
  | "common.loading"
  | "common.error"
  | "common.just_now"
  | "common.minutes_ago"
  | "common.hours_ago"
  | "common.days_ago"
  // Status Bar
  | "status.active_chains"
  | "status.smart_markets"
  // Sidebar
  | "sidebar.collapse"
  | "sidebar.quick_actions"
  | "sidebar.swap"
  | "sidebar.stake"
  | "sidebar.history"
  | "sidebar.lend"
  | "sidebar.coming_soon"
  | "sidebar.download_app"
  | "sidebar.support_hub"
  // Settings
  | "settings.language_region"
  | "settings.application_language"
  | "settings.currency_display"
  | "settings.regional_format"
  | "settings.auto_detected"
  | "settings.applies_sitewide"
  | "settings.notifications"
  // Home
  | "home.title"
  | "home.market"
  | "home.favorites"
  | "home.favourite"
  | "home.hot"
  | "home.new"
  | "home.gainers"
  | "home.losers"
  | "home.top"
  | "home.spotlight"
  // Wallet Modals
  | "wallet.connect_wallet"
  | "wallet.create_new_wallet"
  | "wallet.import_wallet"
  | "wallet.my_wallets"
  | "wallet.create_description"
  | "wallet.import_description"
  | "wallet.connect_external_wallets"
  // Notifications
  | "notifications.title"
  | "notifications.close"
  | "notifications.loading"
  | "notifications.no_notifications"
  // Account/Settings
  | "account.settings"
  | "account.account_details"
  | "account.wallet_name"
  | "account.wallet_address"
  | "account.account_type"
  | "account.networks_connected"
  | "account.my_wallets"
  | "account.active_wallet_description"
  | "account.local_wallet"
  | "account.local_tiwi_wallet"
  | "account.active"
  | "account.no_wallet_connected"
  // Edit Wallet
  | "wallet.edit_name"
  | "wallet.current_name"
  | "wallet.new_name"
  | "wallet.enter_new_name"
  | "wallet.save"
  // Settings Menu
  | "settings.account_details"
  | "settings.connected_devices"
  | "settings.support"
  | "settings.add_new_wallet"
  | "settings.import_wallet"
  | "settings.go_back"
  // Connected Devices
  | "devices.title"
  | "devices.description"
  | "devices.description_detail"
  | "devices.no_sessions"
  | "devices.no_sessions_detail"
  | "devices.device"
  | "devices.ip"
  | "devices.location"
  | "devices.last_active"
  | "devices.active"
  | "devices.terminate"
  | "devices.terminating"
  | "devices.terminate_all"
  | "devices.terminate_all_confirm"
  | "devices.terminate_session_title"
  | "devices.terminate_session_desc"
  | "devices.terminate_all_title"
  | "devices.terminate_all_desc"
  | "devices.terminate_confirm"
  | "devices.not_available"
  | "devices.not_available_desc"
  // Notifications Settings
  | "settings.notifications_title"
  | "settings.transactions_notification"
  | "settings.rewards_earnings"
  | "settings.governance"
  | "settings.news_announcements"
  | "settings.system_alerts"
  // Support Settings
  | "support.title"
  | "support.live_status"
  | "support.faqs"
  | "support.tutorials"
  | "support.report_bug"
  | "support.contact_support"
  // Add/Import Wallet
  | "wallet.create_title"
  | "wallet.create_button"
  | "wallet.generating"
  | "wallet.backup_phrase"
  | "wallet.backup_warning"
  | "wallet.reveal_all"
  | "wallet.confirm_phrase"
  | "wallet.enter_password"
  | "wallet.confirm_password"
  | "wallet.password_hint"
  | "wallet.complete"
  | "wallet.import_title"
  | "wallet.enter_phrase_or_key"
  | "wallet.wallet_name"
  | "wallet.import_button"
  | "wallet.importing"
  | "wallet.invalid_phrase"
  | "wallet.invalid_key";

interface Translations {
  [key: string]: string;
}

/**
 * Translation map: language code -> translations
 * TODO: Expand with more languages and keys
 */
const TRANSLATIONS: Record<string, Translations> = {
  en: {
    "nav.home": "Home",
    "nav.market": "Market",
    "nav.swap": "Swap",
    "nav.pool": "Pool",
    "nav.earn": "Earn",
    "nav.portfolio": "Portfolio",
    "nav.referral": "Referral",
    "nav.settings": "Settings",
    "nav.connect_wallet": "Connect Wallet",
    "nav.disconnect": "Disconnect",
    "nav.notifications": "Notifications",
    "common.apply": "Apply",
    "common.applied": "Applied",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.search": "Search",
    "common.loading": "Loading",
    "common.error": "Error",
    "common.just_now": "Just now",
    "common.minutes_ago": "m ago",
    "common.hours_ago": "h ago",
    "common.days_ago": "d ago",
    "status.active_chains": "Active Chains",
    "status.smart_markets": "Smart Markets",
    "sidebar.collapse": "Collapse",
    "sidebar.quick_actions": "Quick Actions",
    "sidebar.swap": "Swap",
    "sidebar.stake": "Stake",
    "sidebar.history": "History",
    "sidebar.lend": "Lend",
    "sidebar.coming_soon": "Coming soon",
    "sidebar.download_app": "Download App",
    "sidebar.support_hub": "Support Hub",
    "settings.language_region": "Language & Region",
    "settings.application_language": "Application Language",
    "settings.currency_display": "Currency Display",
    "settings.regional_format": "Regional Format",
    "settings.auto_detected": "Auto-detected from language",
    "settings.applies_sitewide": "Applies language, currency, and date/number formats across the entire site.",
    "settings.notifications": "Notifications",
    "settings.account_details": "Account Details",
    "settings.connected_devices": "Connected Devices",
    "settings.support": "Support",
    "settings.add_new_wallet": "Add New Wallet",
    "settings.import_wallet": "Import Wallet",
    "settings.go_back": "Go Back",
    "home.title": "Home",
    "home.market": "Market",
    "home.favorites": "Favorites",
    "home.favourite": "Favourite",
    "home.hot": "Hot",
    "home.new": "New",
    "home.gainers": "Gainers",
    "home.losers": "Losers",
    "home.top": "Top",
    "home.spotlight": "Spotlight",
    "wallet.connect_wallet": "Connect Wallet",
    "wallet.create_new_wallet": "Create New Wallet",
    "wallet.import_wallet": "Import Wallet",
    "wallet.my_wallets": "My Wallets",
    "wallet.create_description": "Set up a brand new wallet in minutes.",
    "wallet.import_description": "Use your existing seed phrase or private key.",
    "wallet.connect_external_wallets": "Connect External Wallets",
    "notifications.title": "Notifications",
    "notifications.close": "Close notifications",
    "notifications.loading": "Loading notifications...",
    "notifications.no_notifications": "No notifications",
    "account.settings": "Account Settings",
    "account.account_details": "Account Details",
    "account.wallet_name": "Wallet Name",
    "account.wallet_address": "Wallet Address",
    "account.account_type": "Account Type",
    "account.networks_connected": "Network(s) connected",
    "account.my_wallets": "My Wallets",
    "account.active_wallet_description": "Active wallet controls balances, NFTs & portfolio views.",
    "account.local_wallet": "Local",
    "account.local_tiwi_wallet": "Local (TIWI non-custodial wallet)",
    "account.active": "Active",
    "account.no_wallet_connected": "No wallet connected",
    "wallet.edit_name": "Edit Wallet Name",
    "wallet.current_name": "Current Wallet Name",
    "wallet.new_name": "New Wallet Name",
    "wallet.enter_new_name": "Enter new wallet name",
    "wallet.save": "Save",
    "devices.title": "Connected Devices",
    "devices.description": "These are the devices currently logged into your TIWI Protocol Wallet. If you notice any unfamiliar activity, terminate the session immediately.",
    "devices.description_detail": "Showing all previously connected devices for your local wallet. The list includes every device that has connected; Last active shows when each was last used.",
    "devices.no_sessions": "No device sessions found.",
    "devices.no_sessions_detail": "Device sessions will appear here when you connect from different devices.",
    "devices.device": "Device",
    "devices.ip": "IP",
    "devices.location": "Location",
    "devices.last_active": "Last active",
    "devices.active": "Active",
    "devices.terminate": "Terminate",
    "devices.terminating": "Terminating...",
    "devices.terminate_all": "Terminate All Sessions",
    "devices.terminate_all_confirm": "Signs out every device except the one you're using now.",
    "devices.terminate_session_title": "Terminate session?",
    "devices.terminate_session_desc": "This will disconnect the wallet on this device. If this is your current device, you will be signed out.",
    "devices.terminate_all_title": "Terminate all other sessions?",
    "devices.terminate_all_desc": "This will sign out every device except this one. Other devices will need to reconnect.",
    "devices.terminate_confirm": "Terminate All",
    "devices.not_available": "Connected Devices",
    "devices.not_available_desc": "Connected devices tracking is only available for local wallets. Please connect a local wallet to view device sessions.",
    "settings.notifications_title": "Notifications",
    "settings.transactions_notification": "Transactions Notification",
    "settings.rewards_earnings": "Rewards & Earnings",
    "settings.governance": "Governance",
    "settings.news_announcements": "News & Announcements",
    "settings.system_alerts": "System Alerts",
    "support.title": "Support",
    "support.live_status": "Live Status",
    "support.faqs": "FAQs",
    "support.tutorials": "Tutorials",
    "support.report_bug": "Report Bug",
    "support.contact_support": "Contact Support",
    "wallet.create_title": "Create New Wallet",
    "wallet.create_button": "Create Wallet",
    "wallet.generating": "Generating...",
    "wallet.backup_phrase": "Backup Your Recovery Phrase",
    "wallet.backup_warning": "Write down this 12-word recovery phrase in the exact order shown. Store it in a safe place. Anyone with this phrase can access your wallet.",
    "wallet.reveal_all": "Reveal All",
    "wallet.confirm_phrase": "Confirm Your Recovery Phrase",
    "wallet.enter_password": "Enter Password",
    "wallet.confirm_password": "Confirm Password",
    "wallet.password_hint": "Set a strong password (at least 8 characters) to secure your wallet locally.",
    "wallet.complete": "Complete",
    "wallet.import_title": "Import Wallet",
    "wallet.enter_phrase_or_key": "Enter your 12-word recovery phrase or private key",
    "wallet.wallet_name": "Wallet Name (optional)",
    "wallet.import_button": "Import Wallet",
    "wallet.importing": "Importing...",
    "wallet.invalid_phrase": "Invalid recovery phrase. Please check and try again.",
    "wallet.invalid_key": "Enter a valid 12/24-word recovery phrase or a 64-character private key.",
  },
  es: {
    "nav.home": "Inicio",
    "nav.market": "Mercado",
    "nav.swap": "Intercambiar",
    "nav.pool": "Pool",
    "nav.earn": "Ganar",
    "nav.portfolio": "Portafolio",
    "nav.settings": "Configuración",
    "nav.connect_wallet": "Conectar Billetera",
    "nav.disconnect": "Desconectar",
    "common.apply": "Aplicar",
    "common.applied": "Aplicado",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.close": "Cerrar",
    "common.search": "Buscar",
    "common.loading": "Cargando",
    "common.error": "Error",
    "settings.language_region": "Idioma y Región",
    "settings.application_language": "Idioma de la Aplicación",
    "settings.currency_display": "Moneda",
    "settings.regional_format": "Formato Regional",
    "settings.auto_detected": "Detectado automáticamente desde el idioma",
    "settings.applies_sitewide": "Aplica idioma, moneda y formatos de fecha/número en todo el sitio.",
    "home.title": "Inicio",
    "home.market": "Mercado",
    "home.favorites": "Favoritos",
    "home.favourite": "Favorito",
    "home.hot": "Tendencia",
    "home.new": "Nuevo",
    "home.gainers": "Subidas",
    "home.losers": "Bajadas",
    "home.top": "Top",
    "home.spotlight": "Destacado",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.market": "Marché",
    "nav.swap": "Échanger",
    "nav.pool": "Pool",
    "nav.earn": "Gagner",
    "nav.portfolio": "Portefeuille",
    "nav.settings": "Paramètres",
    "nav.connect_wallet": "Connecter le Portefeuille",
    "nav.disconnect": "Déconnecter",
    "common.apply": "Appliquer",
    "common.applied": "Appliqué",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.close": "Fermer",
    "common.search": "Rechercher",
    "common.loading": "Chargement",
    "common.error": "Erreur",
    "settings.language_region": "Langue et Région",
    "settings.application_language": "Langue de l'Application",
    "settings.currency_display": "Devise",
    "settings.regional_format": "Format Régional",
    "settings.auto_detected": "Détecté automatiquement depuis la langue",
    "settings.applies_sitewide": "Applique la langue, la devise et les formats de date/nombre sur tout le site.",
    "home.title": "Accueil",
    "home.market": "Marché",
    "home.favorites": "Favoris",
    "home.favourite": "Favori",
    "home.hot": "Tendance",
    "home.new": "Nouveau",
    "home.gainers": "Gagnants",
    "home.losers": "Perdants",
    "home.top": "Top",
    "home.spotlight": "En Vedette",
  },
  de: {
    "nav.home": "Startseite",
    "nav.market": "Markt",
    "nav.swap": "Tauschen",
    "nav.pool": "Pool",
    "nav.earn": "Verdienen",
    "nav.portfolio": "Portfolio",
    "nav.settings": "Einstellungen",
    "nav.connect_wallet": "Wallet verbinden",
    "nav.disconnect": "Trennen",
    "common.apply": "Anwenden",
    "common.applied": "Angewendet",
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.close": "Schließen",
    "common.search": "Suchen",
    "common.loading": "Lädt",
    "common.error": "Fehler",
    "settings.language_region": "Sprache und Region",
    "settings.application_language": "Anwendungssprache",
    "settings.currency_display": "Währung",
    "settings.regional_format": "Regionales Format",
    "settings.auto_detected": "Automatisch aus Sprache erkannt",
    "settings.applies_sitewide": "Wendet Sprache, Währung und Datums-/Zahlenformate auf der gesamten Website an.",
    "home.title": "Startseite",
    "home.market": "Markt",
    "home.favorites": "Favoriten",
    "home.favourite": "Favorit",
    "home.hot": "Trend",
    "home.new": "Neu",
    "home.gainers": "Gewinner",
    "home.losers": "Verlierer",
    "home.top": "Top",
    "home.spotlight": "Highlight",
  },
  zh: {
    "nav.home": "首页",
    "nav.market": "市场",
    "nav.swap": "兑换",
    "nav.pool": "池",
    "nav.earn": "赚取",
    "nav.portfolio": "投资组合",
    "nav.settings": "设置",
    "nav.connect_wallet": "连接钱包",
    "nav.disconnect": "断开连接",
    "common.apply": "应用",
    "common.applied": "已应用",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.close": "关闭",
    "common.search": "搜索",
    "common.loading": "加载中",
    "common.error": "错误",
    "settings.language_region": "语言和地区",
    "settings.application_language": "应用语言",
    "settings.currency_display": "货币",
    "settings.regional_format": "区域格式",
    "settings.auto_detected": "从语言自动检测",
    "settings.applies_sitewide": "在整个站点应用语言、货币和日期/数字格式。",
    "home.title": "首页",
    "home.market": "市场",
    "home.favorites": "收藏",
    "home.favourite": "收藏",
    "home.hot": "热门",
    "home.new": "新",
    "home.gainers": "涨幅",
    "home.losers": "跌幅",
    "home.top": "顶部",
    "home.spotlight": "焦点",
  },
  ja: {
    "nav.home": "ホーム",
    "nav.market": "マーケット",
    "nav.swap": "スワップ",
    "nav.pool": "プール",
    "nav.earn": "獲得",
    "nav.portfolio": "ポートフォリオ",
    "nav.settings": "設定",
    "nav.connect_wallet": "ウォレットを接続",
    "nav.disconnect": "切断",
    "common.apply": "適用",
    "common.applied": "適用済み",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.close": "閉じる",
    "common.search": "検索",
    "common.loading": "読み込み中",
    "common.error": "エラー",
    "settings.language_region": "言語と地域",
    "settings.application_language": "アプリケーション言語",
    "settings.currency_display": "通貨",
    "settings.regional_format": "地域形式",
    "settings.auto_detected": "言語から自動検出",
    "settings.applies_sitewide": "言語、通貨、日付/数値形式をサイト全体に適用します。",
    "home.title": "ホーム",
    "home.market": "マーケット",
    "home.favorites": "お気に入り",
    "home.favourite": "お気に入り",
    "home.hot": "トレンド",
    "home.new": "新規",
    "home.gainers": "上昇",
    "home.losers": "下降",
    "home.top": "トップ",
    "home.spotlight": "スポットライト",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.market": "السوق",
    "nav.swap": "تبديل",
    "nav.pool": "مجمع",
    "nav.earn": "كسب",
    "nav.portfolio": "المحفظة",
    "nav.settings": "الإعدادات",
    "nav.connect_wallet": "ربط المحفظة",
    "nav.disconnect": "قطع الاتصال",
    "common.apply": "تطبيق",
    "common.applied": "تم التطبيق",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.close": "إغلاق",
    "common.search": "بحث",
    "common.loading": "جاري التحميل",
    "common.error": "خطأ",
    "settings.language_region": "اللغة والمنطقة",
    "settings.application_language": "لغة التطبيق",
    "settings.currency_display": "العملة",
    "settings.regional_format": "التنسيق الإقليمي",
    "settings.auto_detected": "تم الكشف تلقائياً من اللغة",
    "settings.applies_sitewide": "يطبق اللغة والعملة وتنسيقات التاريخ/الأرقام على الموقع بأكمله.",
    "home.title": "الرئيسية",
    "home.market": "السوق",
    "home.favorites": "المفضلة",
    "home.favourite": "المفضلة",
    "home.hot": "ترند",
    "home.new": "جديد",
    "home.gainers": "صاعد",
    "home.losers": "هابط",
    "home.top": "الأعلى",
    "home.spotlight": "الضوء",
  },
  // Add more languages as needed...
};

/**
 * Gets translation for a key in the specified language.
 * Returns English as fallback if translation not found (for async API translation).
 */
export function getTranslation(key: TranslationKey, language: string): string {
  // Normalize language code: handle variants like zh-Hans, zh-Hant -> zh
  const lang = (language || "").split("-")[0].toLowerCase();
  
  // If English or translation exists, return it
  if (lang === 'en') {
    return TRANSLATIONS.en?.[key] || key;
  }
  
  const translations = TRANSLATIONS[lang];
  if (translations && translations[key]) {
    return translations[key];
  }
  
  // Return English fallback - this will be used for async translation
  return TRANSLATIONS.en?.[key] || key;
}

/**
 * Get English text for a key (used as source for translation)
 */
export function getEnglishText(key: TranslationKey): string {
  return TRANSLATIONS.en?.[key] || key;
}

/**
 * Get all available language codes
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(TRANSLATIONS);
}
