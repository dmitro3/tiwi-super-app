export type SettingsView =
  | "main"
  | "edit-wallet-name"
  | "export-private-key-warning"
  | "export-private-key-revealed"
  | "export-recovery-phrase-warning"
  | "export-recovery-phrase-click"
  | "export-recovery-phrase-revealed"
  | "disconnect-wallet"
  | "security"
  | "change-pin"
  | "fraud-alerts"
  | "whitelist-addresses"
  | "connected-devices"
  | "terminate-device"
  | "language-region"
  | "notifications"
  | "transactions-notifications"
  | "rewards-earnings"
  | "governance"
  | "news-announcements"
  | "system-alerts"
  | "app-updates-cache"
  | "support"
  | "live-status"
  | "faqs"
  | "tutorials"
  | "report-bug"
  | "contact-support"
  | "add-new-wallet"
  | "import-wallet";

export interface SettingsMenuItem {
  label: string;
  view: SettingsView;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}


