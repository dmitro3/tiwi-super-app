"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { IoArrowBack, IoChevronForward, IoChevronDown, IoRefresh } from "react-icons/io5";
import { FiCopy, FiCheck, FiDownload, FiTrash2, FiFile, FiSettings, FiMail, FiSend, FiPlus, FiUpload } from "react-icons/fi";
import { FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineCloudUpload } from "react-icons/hi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { SettingsView } from "@/components/settings/types";
import MobileSettingsView from "@/components/settings/mobile-settings-view";
import DesktopSettingsView from "@/components/settings/desktop-settings-view";

const chainIcons = [
  "/assets/chains/chain-1.svg",
  "/assets/chains/chain-2.svg",
  "/assets/chains/chain-3.svg",
  "/assets/chains/chain-4.svg",
  "/assets/chains/chain-5.svg",
  "/assets/chains/chain-6.svg",
  "/assets/chains/chain-7.svg",
  "/assets/chains/chain-8.svg",
  "/assets/chains/chain-9.svg",
];

const recoveryPhrase = [
  "abandon",
  "ability",
  "able",
  "about",
  "above",
  "absent",
  "absorb",
  "abstract",
  "absurd",
  "abuse",
  "access",
  "accident",
];

const languages = [
  "English",
  "French",
  "Spanish",
  "Chinese",
  "Arabic",
  "Portuguese",
];

const currencies = ["USD", "EUR", "NGN", "GBP", "CNY", "JPY"];

const regionalFormats = ["MM/DD/YY", "DD/MM/YY", "YYYY-MM-DD"];

const connectedDevices = [
  {
    id: 1,
    device: "iPhone 14 Pro",
    ip: "102.89.14.221",
    location: "New York",
    status: "Active",
    isActive: true,
  },
  {
    id: 2,
    device: "iPhone 14 Pro",
    ip: "102.89.14.221",
    location: "New York",
    status: "2 Min Ago",
    isActive: false,
  },
  {
    id: 3,
    device: "iPhone 14 Pro",
    ip: "102.89.14.221",
    location: "New York",
    status: "2 Min Ago",
    isActive: false,
  },
  {
    id: 4,
    device: "iPhone 14 Pro",
    ip: "102.89.14.221",
    location: "New York",
    status: "2 Min Ago",
    isActive: false,
  },
  {
    id: 5,
    device: "iPhone 14 Pro",
    ip: "102.89.14.221",
    location: "New York",
    status: "2 Min Ago",
    isActive: false,
  },
];

export default function SettingsPage() {
  const [currentView, setCurrentView] = useState<SettingsView>("main");
  const [walletName, setWalletName] = useState("Wallet 1");
  const [newWalletName, setNewWalletName] = useState("");
  const [privateKeyRevealed, setPrivateKeyRevealed] = useState(false);
  const [recoveryPhraseRevealed, setRecoveryPhraseRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedPhrases, setSavedPhrases] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(true);
  const [transactionRisk, setTransactionRisk] = useState(true);
  const [flaggedAddress, setFlaggedAddress] = useState(true);
  const [deviceToTerminate, setDeviceToTerminate] = useState<{
    device: string;
    ip: string;
    location: string;
    status: string;
  } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedFormat, setSelectedFormat] = useState("MM/DD/YY");
  const [openDropdown, setOpenDropdown] = useState<
    "language" | "currency" | "format" | null
  >(null);
  const [transactionsEnabled, setTransactionsEnabled] = useState(true);
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [governanceEnabled, setGovernanceEnabled] = useState(true);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [systemAlertsEnabled, setSystemAlertsEnabled] = useState(true);
  // Transaction notifications
  const [swapCompleted, setSwapCompleted] = useState(true);
  const [liquidityAdded, setLiquidityAdded] = useState(true);
  const [receivedPayment, setReceivedPayment] = useState(true);
  const [failedTransactions, setFailedTransactions] = useState(true);
  const [onChainConfirmations, setOnChainConfirmations] = useState(true);
  // Rewards & Earnings
  const [stakingRewards, setStakingRewards] = useState(true);
  const [farmingRewards, setFarmingRewards] = useState(true);
  const [nftStakingPayout, setNftStakingPayout] = useState(true);
  const [lendingInterest, setLendingInterest] = useState(true);
  // Governance
  const [newProposal, setNewProposal] = useState(true);
  const [votingDeadline, setVotingDeadline] = useState(true);
  const [proposalResults, setProposalResults] = useState(true);
  // News & Announcements
  const [protocolUpdates, setProtocolUpdates] = useState(true);
  const [newFeatureAlerts, setNewFeatureAlerts] = useState(true);
  const [securityUpdates, setSecurityUpdates] = useState(true);
  // System Alerts
  const [networkCongestion, setNetworkCongestion] = useState(true);
  const [maintenanceWarnings, setMaintenanceWarnings] = useState(true);
  const [protocolIncidents, setProtocolIncidents] = useState(true);
  const [downtimeUpdates, setDowntimeUpdates] = useState(true);
  const [sendDeviceInfo, setSendDeviceInfo] = useState(false);
  const [bugDescription, setBugDescription] = useState("");
  const [faqSearch, setFaqSearch] = useState("");
  const [tutorialSearch, setTutorialSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const walletAddress = "0xDB...T432";
  const fullWalletAddress = "0xdeadbeef1234567890abcdef1234567890ab";
  const privateKey = "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWalletName = () => {
    if (newWalletName.trim()) {
      setWalletName(newWalletName.trim());
      setNewWalletName("");
      setCurrentView("main");
    }
  };

  const handleGoBack = () => {
    if (currentView === "security") {
      setCurrentView("main");
    } else if (
      currentView === "change-pin" ||
      currentView === "fraud-alerts" ||
      currentView === "whitelist-addresses"
    ) {
      setCurrentView("security");
    } else if (currentView === "terminate-device") {
      setCurrentView("connected-devices");
      setDeviceToTerminate(null);
    } else if (
      currentView === "transactions-notifications" ||
      currentView === "rewards-earnings" ||
      currentView === "governance" ||
      currentView === "news-announcements" ||
      currentView === "system-alerts"
    ) {
      setCurrentView("notifications");
    } else if (
      currentView === "live-status" ||
      currentView === "faqs" ||
      currentView === "tutorials" ||
      currentView === "report-bug" ||
      currentView === "contact-support"
    ) {
      setCurrentView("support");
    } else {
      setCurrentView("main");
    }
    setPrivateKeyRevealed(false);
    setRecoveryPhraseRevealed(false);
    setNewWalletName("");
    setSavedPhrases(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setOpenDropdown(null);
  };

  const settingsMenuItems = [
    { label: "Account Details", view: "main" as SettingsView },
    { label: "Security", view: "security" as SettingsView },
    { label: "Connected Devices", view: "connected-devices" as SettingsView },
    { label: "Language & Region", view: "language-region" as SettingsView },
    { label: "Notifications", view: "notifications" as SettingsView },
    { label: "App Updates & Cache", view: "app-updates-cache" as SettingsView },
    { label: "Support", view: "support" as SettingsView },
    { label: "Add New Wallet", view: "add-new-wallet" as SettingsView },
    { label: "Import Wallet", view: "import-wallet" as SettingsView },
  ];

  const securityMenuItems = [
    { label: "Change PIN", view: "change-pin" as SettingsView },
    {
      label: "Fraud Alerts & Suspicious Activity",
      view: "fraud-alerts" as SettingsView,
    },
    { label: "Whitelist Addresses", view: "whitelist-addresses" as SettingsView },
  ];

  const chainIconsList = chainIcons;

  return (
    <div className="min-h-screen bg-[#010501] text-white font-manrope">
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileSettingsView
          currentView={currentView}
          onViewChange={setCurrentView}
          onGoBack={handleGoBack}
          walletName={walletName}
          walletAddress={walletAddress}
          chainIcons={chainIconsList}
          connectedDevices={connectedDevices}
          transactionsEnabled={transactionsEnabled}
          rewardsEnabled={rewardsEnabled}
          governanceEnabled={governanceEnabled}
          newsEnabled={newsEnabled}
          systemAlertsEnabled={systemAlertsEnabled}
          onToggleTransactions={setTransactionsEnabled}
          onToggleRewards={setRewardsEnabled}
          onToggleGovernance={setGovernanceEnabled}
          onToggleNews={setNewsEnabled}
          onToggleSystemAlerts={setSystemAlertsEnabled}
          onTerminateDevice={(device) => {
            setDeviceToTerminate({
              device: device.device,
              ip: device.ip,
              location: device.location,
              status: device.status,
            });
            setCurrentView("terminate-device");
          }}
          onTerminateAll={() => {
            // Handle terminate all
          }}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
            {currentView === "main"
              ? "Settings/Account Details"
              : currentView === "security"
              ? "Settings/Security"
              : currentView === "edit-wallet-name"
              ? "Edit Wallet Name"
              : currentView === "change-pin"
              ? "Change Pin"
              : currentView === "fraud-alerts"
              ? "Fraud Alert"
              : currentView === "whitelist-addresses"
              ? "Whitelist Addres..."
              : currentView === "connected-devices"
              ? "Settings/Connected Devices"
              : currentView === "terminate-device"
              ? "Terminate"
              : currentView === "language-region"
              ? "Settings/Language"
              : currentView === "notifications"
              ? "Settings/Notifications"
              : currentView === "transactions-notifications"
              ? "Transactions Notification"
              : currentView === "rewards-earnings"
              ? "Rewards & Earnings"
              : currentView === "governance"
              ? "Governance"
              : currentView === "news-announcements"
              ? "News & Announcements"
              : currentView === "system-alerts"
              ? "System Alerts"
              : currentView === "app-updates-cache"
              ? "Settings/App Update"
              : currentView === "support"
              ? "Settings/Support"
              : currentView === "live-status"
              ? "Live Status"
              : currentView === "faqs"
              ? "Faqs"
              : currentView === "tutorials"
              ? "Tutorials"
              : currentView === "report-bug"
              ? "Report Bug"
              : currentView === "contact-support"
              ? "Contact Support"
              : currentView === "add-new-wallet"
              ? "Add New Wallet"
              : currentView === "import-wallet"
              ? "Import Wallet"
              : currentView === "export-private-key-warning" ||
                currentView === "export-private-key-revealed"
              ? "Export Private Key"
              : currentView === "export-recovery-phrase-warning" ||
                currentView === "export-recovery-phrase-click" ||
                currentView === "export-recovery-phrase-revealed"
              ? "Export Recovery Phrase"
              : currentView === "disconnect-wallet"
              ? "Disconnect Wallet"
              : "Settings"}
          </h1>
          </div>

          <DesktopSettingsView
            currentView={currentView}
            onViewChange={setCurrentView}
            walletName={walletName}
            walletAddress={walletAddress}
            chainIcons={chainIconsList}
          >

            {/* Edit Wallet Name View */}
            {currentView === "edit-wallet-name" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Edit Wallet Name
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Enter New Wallet Name
                    </label>
                    <input
                      type="text"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      placeholder="New Wallet Name"
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>

                  <button
                    onClick={handleSaveWalletName}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Export Private Key Warning */}
            {currentView === "export-private-key-warning" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Export Private Key
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <HiExclamationTriangle
                      className="text-red-500 shrink-0 mt-1"
                      size={24}
                    />
                    <div>
                      <p className="text-lg font-semibold text-white mb-2">
                        Your Private Key Controls Your Entire Wallet
                      </p>
                      <p className="text-sm text-[#B5B5B5] mb-4">
                        This key grants full access to your funds, assets, and
                        transactions.
                      </p>
                      <ul className="space-y-2 text-sm text-[#B5B5B5] list-disc list-inside">
                        <li>Never share your private key with anyone</li>
                        <li>Do not store it online or screenshot it</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        setCurrentView("export-private-key-revealed")
                      }
                      className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                    >
                      Show Private Key
                    </button>
                    <button
                      onClick={handleGoBack}
                      className="flex-1 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export Private Key Revealed */}
            {currentView === "export-private-key-revealed" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Export Private Key
                </h2>

                <div className="space-y-6">
                  <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4">
                    <p className="text-sm font-mono text-white break-all">
                      {privateKey}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleCopy(privateKey)}
                      className="flex-1 flex items-center justify-center gap-2 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                    >
                      {copied ? (
                        <>
                          <FiCheck size={18} />
                          Copied
                        </>
                      ) : (
                        <>
                          <FiCopy size={18} />
                          Copy Address
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(privateKey)}
                      className="flex-1 flex items-center justify-center gap-2 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                    >
                      <FiDownload size={18} />
                      Download Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export Recovery Phrase Warning */}
            {currentView === "export-recovery-phrase-warning" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Export Recovery Phrases
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <HiExclamationTriangle
                      className="text-red-500 shrink-0 mt-1"
                      size={24}
                    />
                    <div>
                      <p className="text-lg font-semibold text-white mb-2">
                        Never Share Your Recovery Phrase
                      </p>
                      <p className="text-sm text-[#B5B5B5]">
                        Your recovery phrase is the master key to your entire
                        wallet. Anyone who gets access to it can restore your
                        wallet and take off all your assets - without permission.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        setCurrentView("export-recovery-phrase-click")
                      }
                      className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                    >
                      Show Recovery Phrase
                    </button>
                    <button
                      onClick={handleGoBack}
                      className="flex-1 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export Recovery Phrase Click to Reveal */}
            {currentView === "export-recovery-phrase-click" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Export Recovery Phrase
                </h2>

                <div className="space-y-6">
                  <button
                    onClick={() =>
                      setCurrentView("export-recovery-phrase-revealed")
                    }
                    className="w-full bg-[#B1F128]/20 border-2 border-[#B1F128] rounded-xl p-12 text-center hover:bg-[#B1F128]/30 transition-colors"
                  >
                    <p className="text-lg font-semibold text-[#B1F128] mb-2">
                      Click to reveal your Secret Recover Phrase
                    </p>
                    <p className="text-sm text-[#B5B5B5]">
                      Make sure no one is watching you.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Export Recovery Phrase Revealed */}
            {currentView === "export-recovery-phrase-revealed" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Backup Wallet
                </h2>

                <div className="space-y-6">
                  <p className="text-sm text-[#B5B5B5]">
                    This secret phrase unlocks your wallet. We do not have
                    access to this key. Ensure your blockchain data is well
                    protected.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {recoveryPhrase.map((word, index) => (
                      <div
                        key={index}
                        className="bg-[#010501] border border-[#B1F128] rounded-lg p-3 text-center"
                      >
                        <span className="text-xs text-[#B5B5B5] mr-2">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium text-white">
                          {word}
                        </span>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savedPhrases}
                      onChange={(e) => setSavedPhrases(e.target.checked)}
                      className="w-5 h-5 rounded border-[#1f261e] bg-[#010501] text-[#B1F128] focus:ring-[#B1F128] focus:ring-2"
                    />
                    <span className="text-sm text-[#B5B5B5]">
                      I have saved the phrases
                    </span>
                  </label>

                  <button
                    onClick={() => {
                      if (savedPhrases) {
                        handleGoBack();
                      }
                    }}
                    disabled={!savedPhrases}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Backup
                  </button>

                  <p className="text-xs text-center text-[#6E7873]">
                    By proceeding, you agree to our Terms & Conditions and
                    Privacy Policy.
                  </p>
                </div>
              </div>
            )}

            {/* Security Sub-menu */}
            {currentView === "security" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-xl font-semibold text-white mb-6">
                  Security
                </h2>

                <nav className="space-y-1">
                  {securityMenuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentView(item.view)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#B5B5B5] hover:bg-[#121712] transition-colors"
                    >
                      <span>{item.label}</span>
                      <IoChevronForward size={16} className="opacity-60" />
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Change PIN */}
            {currentView === "change-pin" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Change Password
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Enter current PIN
                    </label>
                    <input
                      type="password"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="Enter current PIN"
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Set new PIN
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Set new PIN"
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Confirm new PIN
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Confirm new PIN"
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (newPin && confirmPin && newPin === confirmPin) {
                        // Handle PIN change
                        handleGoBack();
                      }
                    }}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* Fraud Alerts */}
            {currentView === "fraud-alerts" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Fraud Alerts
                </h2>

                <div className="space-y-6">
                  {/* Suspicious Activity Alerts */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-base text-[#B5B5B5]">
                      Suspicious Activity Alerts
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={suspiciousAlerts}
                        onChange={(e) => setSuspiciousAlerts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* Transaction Risk Scores */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-base text-[#B5B5B5]">
                      Transaction Risk Scores
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transactionRisk}
                        onChange={(e) => setTransactionRisk(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* Flagged Address Warnings */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-base text-[#B5B5B5]">
                      Flagged Address Warnings
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flaggedAddress}
                        onChange={(e) => setFlaggedAddress(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Whitelist Addresses */}
            {currentView === "whitelist-addresses" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Whitelist Address
                </h2>

                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  {/* Book Icon */}
                  <div className="w-24 h-24 flex items-center justify-center">
                    <svg
                      width="96"
                      height="96"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#B5B5B5]"
                    >
                      <path
                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 7h8M8 11h8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <p className="text-base text-[#B5B5B5]">
                    No Address Added Yet
                  </p>

                  <button
                    onClick={() => {
                      // Handle add address
                    }}
                    className="bg-[#B1F128] text-[#010501] font-semibold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Add Address
                  </button>
                </div>
              </div>
            )}

            {/* Connected Devices */}
            {currentView === "connected-devices" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-4">
                  Connected Devices
                </h2>

                <p className="text-sm text-[#B5B5B5] mb-6">
                  These are the devices currently logged into your TIWI Protocol
                  Wallet. If you notice any unfamiliar activity, terminate the
                  session immediately.
                </p>

                <div className="space-y-3 mb-8">
                  {connectedDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <p className="text-base font-medium text-white min-w-[140px]">
                          {device.device}
                        </p>
                        <p className="text-sm text-[#B5B5B5] min-w-[120px]">
                          {device.ip}
                        </p>
                        <p className="text-sm text-[#B5B5B5] min-w-[100px]">
                          {device.location}
                        </p>
                        <p
                          className={`text-sm min-w-[100px] ${
                            device.isActive
                              ? "text-[#B1F128]"
                              : "text-[#B5B5B5]"
                          }`}
                        >
                          {device.status}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDeviceToTerminate({
                            device: device.device,
                            ip: device.ip,
                            location: device.location,
                            status: device.status,
                          });
                          setCurrentView("terminate-device");
                        }}
                        className="text-[#B1F128] font-medium text-sm hover:opacity-80 transition-opacity ml-4 shrink-0"
                      >
                        Terminate
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // Handle terminate all sessions
                    }}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Terminate All Sessions
                  </button>
                  <p className="text-xs text-center text-[#B5B5B5]">
                    Signs out every device except the one you're using now.
                  </p>
                </div>
              </div>
            )}

            {/* Terminate Device Confirmation */}
            {currentView === "terminate-device" && deviceToTerminate && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  End This Session
                </h2>

                <p className="text-sm text-[#B5B5B5] mb-6">
                  This device will be logged out immediately and will no longer
                  have access to your wallet.
                </p>

                <div className="space-y-2 mb-6">
                  <p className="text-base font-medium text-white">
                    {deviceToTerminate.device}
                  </p>
                  <p className="text-sm text-[#B5B5B5]">
                    {deviceToTerminate.ip}
                  </p>
                  <p className="text-sm text-[#B5B5B5]">
                    {deviceToTerminate.location}
                  </p>
                  <p className="text-sm text-[#B5B5B5]">
                    {deviceToTerminate.status}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      // Handle terminate
                      handleGoBack();
                    }}
                    className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Yes Terminate
                  </button>
                  <button
                    onClick={handleGoBack}
                    className="flex-1 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Language & Region */}
            {currentView === "language-region" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Language & Region
                </h2>

                <div className="space-y-6" ref={dropdownRef}>
                  {/* Application Language Dropdown */}
                  <div className="relative">
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Application Language
                    </label>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === "language" ? null : "language"
                          )
                        }
                        className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
                      >
                        <span>{selectedLanguage}</span>
                        <IoChevronDown
                          size={20}
                          className={`text-[#B5B5B5] transition-transform ${
                            openDropdown === "language" ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openDropdown === "language" && (
                        <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                          {languages.map((language) => (
                            <button
                              key={language}
                              onClick={() => {
                                setSelectedLanguage(language);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  selectedLanguage === language
                                    ? "border-[#B1F128] bg-[#B1F128]"
                                    : "border-[#3E453E]"
                                }`}
                              >
                                {selectedLanguage === language && (
                                  <div className="w-2 h-2 rounded-full bg-[#010501]" />
                                )}
                              </div>
                              <span
                                className={`text-sm ${
                                  selectedLanguage === language
                                    ? "text-white"
                                    : "text-[#B5B5B5]"
                                }`}
                              >
                                {language}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Currency Display Dropdown */}
                  <div className="relative">
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Currency Display
                    </label>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === "currency" ? null : "currency"
                          )
                        }
                        className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
                      >
                        <span>{selectedCurrency}</span>
                        <IoChevronDown
                          size={20}
                          className={`text-[#B5B5B5] transition-transform ${
                            openDropdown === "currency" ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openDropdown === "currency" && (
                        <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                          {currencies.map((currency) => (
                            <button
                              key={currency}
                              onClick={() => {
                                setSelectedCurrency(currency);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  selectedCurrency === currency
                                    ? "border-[#B1F128] bg-[#B1F128]"
                                    : "border-[#3E453E]"
                                }`}
                              >
                                {selectedCurrency === currency && (
                                  <div className="w-2 h-2 rounded-full bg-[#010501]" />
                                )}
                              </div>
                              <span
                                className={`text-sm ${
                                  selectedCurrency === currency
                                    ? "text-white"
                                    : "text-[#B5B5B5]"
                                }`}
                              >
                                {currency}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Regional Format Dropdown */}
                  <div className="relative">
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Regional Format
                    </label>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === "format" ? null : "format"
                          )
                        }
                        className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
                      >
                        <span>{selectedFormat}</span>
                        <IoChevronDown
                          size={20}
                          className={`text-[#B5B5B5] transition-transform ${
                            openDropdown === "format" ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openDropdown === "format" && (
                        <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                          {regionalFormats.map((format) => (
                            <button
                              key={format}
                              onClick={() => {
                                setSelectedFormat(format);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  selectedFormat === format
                                    ? "border-[#B1F128] bg-[#B1F128]"
                                    : "border-[#3E453E]"
                                }`}
                              >
                                {selectedFormat === format && (
                                  <div className="w-2 h-2 rounded-full bg-[#010501]" />
                                )}
                              </div>
                              <span
                                className={`text-sm ${
                                  selectedFormat === format
                                    ? "text-white"
                                    : "text-[#B5B5B5]"
                                }`}
                              >
                                {format}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Main View */}
            {currentView === "notifications" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Notifications
                </h2>

                <div className="space-y-4">
                  {/* Transactions Notification */}
                  <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <button
                      onClick={() => setCurrentView("transactions-notifications")}
                      className="flex-1 text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">
                        Transactions Notification
                      </span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transactionsEnabled}
                        onChange={(e) => setTransactionsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* Rewards & Earnings */}
                  <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <button
                      onClick={() => setCurrentView("rewards-earnings")}
                      className="flex-1 text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">
                        Rewards & Earnings
                      </span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rewardsEnabled}
                        onChange={(e) => setRewardsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* Governance */}
                  <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <button
                      onClick={() => setCurrentView("governance")}
                      className="flex-1 text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">
                        Governance
                      </span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={governanceEnabled}
                        onChange={(e) => setGovernanceEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* News & Announcements */}
                  <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <button
                      onClick={() => setCurrentView("news-announcements")}
                      className="flex-1 text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">
                        News & Announcements
                      </span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newsEnabled}
                        onChange={(e) => setNewsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* System Alerts */}
                  <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <button
                      onClick={() => setCurrentView("system-alerts")}
                      className="flex-1 text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">
                        System Alerts
                      </span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemAlertsEnabled}
                        onChange={(e) => setSystemAlertsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Notifications */}
            {currentView === "transactions-notifications" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Transactions Notification
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Swap Completed", state: swapCompleted, setter: setSwapCompleted },
                    { label: "Liquidity Added/Removed", state: liquidityAdded, setter: setLiquidityAdded },
                    { label: "Received Payment", state: receivedPayment, setter: setReceivedPayment },
                    { label: "Failed Transactions", state: failedTransactions, setter: setFailedTransactions },
                    { label: "On-chain confirmations", state: onChainConfirmations, setter: setOnChainConfirmations },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards & Earnings */}
            {currentView === "rewards-earnings" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Rewards & Earnings
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Staking rewards", state: stakingRewards, setter: setStakingRewards },
                    { label: "Farming rewards", state: farmingRewards, setter: setFarmingRewards },
                    { label: "NFT Staking payout", state: nftStakingPayout, setter: setNftStakingPayout },
                    { label: "Lending interest updates", state: lendingInterest, setter: setLendingInterest },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Governance */}
            {currentView === "governance" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Governance
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "New proposal", state: newProposal, setter: setNewProposal },
                    { label: "Voting deadline reminder", state: votingDeadline, setter: setVotingDeadline },
                    { label: "Proposal results", state: proposalResults, setter: setProposalResults },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News & Announcements */}
            {currentView === "news-announcements" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  News & Announcements
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Protocol updates", state: protocolUpdates, setter: setProtocolUpdates },
                    { label: "New feature alerts", state: newFeatureAlerts, setter: setNewFeatureAlerts },
                    { label: "Security updates", state: securityUpdates, setter: setSecurityUpdates },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Alerts */}
            {currentView === "system-alerts" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  System Alerts
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Network congestion", state: networkCongestion, setter: setNetworkCongestion },
                    { label: "Maintenance warnings", state: maintenanceWarnings, setter: setMaintenanceWarnings },
                    { label: "Protocol incidents", state: protocolIncidents, setter: setProtocolIncidents },
                    { label: "Downtime updates", state: downtimeUpdates, setter: setDowntimeUpdates },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* App Updates & Cache */}
            {currentView === "app-updates-cache" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  App Updates and Cache
                </h2>

                <div className="space-y-3">
                  {/* Check for Updates */}
                  <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <IoRefresh size={20} className="text-[#B5B5B5]" />
                      <span className="text-base text-[#B5B5B5]">
                        Check for Updates
                      </span>
                    </div>
                    <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                  </button>

                  {/* Clear Cache */}
                  <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <FiTrash2 size={20} className="text-[#B5B5B5]" />
                      <span className="text-base text-[#B5B5B5]">
                        Clear Cache
                      </span>
                    </div>
                    <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                  </button>

                  {/* Reset Temporary Files */}
                  <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <FiFile size={20} className="text-[#B5B5B5]" />
                      <span className="text-base text-[#B5B5B5]">
                        Reset Temporary Files
                      </span>
                    </div>
                    <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                  </button>

                  {/* Refresh NFT Metadata */}
                  <button className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <IoRefresh size={20} className="text-[#B5B5B5]" />
                      <span className="text-base text-[#B5B5B5]">
                        Refresh NFT Metadata
                      </span>
                    </div>
                    <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                  </button>

                  {/* Developer Mode */}
                  <div className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
                    <div className="flex items-center gap-3">
                      <FiSettings size={20} className="text-[#B5B5B5]" />
                      <span className="text-base text-[#B5B5B5]">
                        Developer Mode
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Support Main View */}
            {currentView === "support" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Support
                </h2>

                <div className="space-y-3">
                  {[
                    { label: "Live Status", view: "live-status" },
                    { label: "FAQs", view: "faqs" },
                    { label: "Tutorials", view: "tutorials" },
                    { label: "Report a Bug", view: "report-bug" },
                    { label: "Contact Support", view: "contact-support" },
                  ].map((item) => (
                    <button
                      key={item.view}
                      onClick={() => setCurrentView(item.view as SettingsView)}
                      className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Status */}
            {currentView === "live-status" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Live Status
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Swap", status: "Operational", color: "green" },
                    { label: "Liquidity", status: "Degraded", color: "yellow" },
                    { label: "Bridge", status: "Operational", color: "green" },
                    { label: "Governance", status: "Operational", color: "green" },
                    { label: "Nodes", status: "Down", color: "red" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                          item.color === "green"
                            ? "bg-[#B1F128] text-[#010501]"
                            : item.color === "yellow"
                            ? "bg-yellow-500 text-[#010501]"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {currentView === "faqs" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  FAQs
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                  />

                  {[
                    "Is TIVI Protocol open source?",
                    "Can I pay gas without native tokens?",
                    "Which chains are supported?",
                    "What are the lending limits?",
                    "Can I stake NFTs?",
                    "How do merchants use TIVI Pay?",
                  ].map((question) => (
                    <button
                      key={question}
                      onClick={() =>
                        setExpandedFaq(
                          expandedFaq === question ? null : question
                        )
                      }
                      className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
                    >
                      <span className="text-base text-[#B5B5B5]">{question}</span>
                      <IoChevronDown
                        size={20}
                        className={`text-[#B5B5B5] opacity-60 transition-transform ${
                          expandedFaq === question ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tutorials */}
            {currentView === "tutorials" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Tutorials
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={tutorialSearch}
                    onChange={(e) => setTutorialSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                  />

                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {[
                      { title: "How to swap", desc: "Learn the basics of..." },
                      { title: "Add liquidity", desc: "Learn the basics of..." },
                      { title: "Create a pool", desc: "Learn the basics of..." },
                      { title: "Share a pool", desc: "Learn the basics of..." },
                    ].map((tutorial, index) => (
                      <div
                        key={index}
                        className="min-w-[200px] bg-[#010501] rounded-xl border border-[#1f261e] overflow-hidden"
                      >
                        <div className="w-full h-32 bg-[#121712] flex items-center justify-center">
                          <span className="text-[#6E7873] text-sm">Thumbnail</span>
                        </div>
                        <div className="p-4">
                          <h3 className="text-white font-medium mb-1">
                            {tutorial.title}
                          </h3>
                          <p className="text-sm text-[#B5B5B5]">
                            {tutorial.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Report Bug */}
            {currentView === "report-bug" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-4">
                  Report a Bug
                </h2>

                <p className="text-sm text-[#B5B5B5] mb-6">
                  Help us improve TIVI Protocol by reporting any issues you
                  encounter. Our team will review your report promptly.
                </p>

                <div className="space-y-6">
                  {/* Attach Screenshot */}
                  <div className="border-2 border-dashed border-[#1f261e] rounded-xl p-8 text-center bg-[#010501]">
                    <HiOutlineCloudUpload
                      size={32}
                      className="text-[#B5B5B5] mx-auto mb-3"
                    />
                    <p className="text-sm text-[#B5B5B5] mb-3">
                      Drag or drop files here or browse your computer.
                    </p>
                    <button className="bg-[#B1F128] text-[#010501] font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-sm">
                      Browse File
                    </button>
                    <p className="text-xs text-[#6E7873] mt-2">
                      Attach Screenshot (Recommended)
                    </p>
                  </div>

                  {/* Add Log File */}
                  <div className="border-2 border-dashed border-[#1f261e] rounded-xl p-8 text-center bg-[#010501]">
                    <HiOutlineCloudUpload
                      size={32}
                      className="text-[#B5B5B5] mx-auto mb-3"
                    />
                    <p className="text-sm text-[#B5B5B5] mb-3">
                      Choose a log file to help us understand your issue.
                    </p>
                    <button className="bg-[#B1F128] text-[#010501] font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-sm">
                      Browse File
                    </button>
                    <p className="text-xs text-[#6E7873] mt-2">
                      Add Log File (Optional)
                    </p>
                  </div>

                  {/* Describe the Issue */}
                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      Describe the Issue
                    </label>
                    <textarea
                      value={bugDescription}
                      onChange={(e) => setBugDescription(e.target.value)}
                      placeholder="Tell us what happened."
                      rows={6}
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128] resize-none"
                    />
                  </div>

                  {/* Send Device Info Toggle */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-base text-[#B5B5B5]">
                      Send Device Info Automatically
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendDeviceInfo}
                        onChange={(e) => setSendDeviceInfo(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity">
                    Submit Bug/Report
                  </button>
                </div>
              </div>
            )}

            {/* Contact Support */}
            {currentView === "contact-support" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Contact Support
                </h2>

                <div className="space-y-3">
                  {[
                    { label: "Email", icon: FiMail },
                    { label: "Telegram", icon: FaTelegramPlane },
                    { label: "X (formerly Twitter)", icon: FaXTwitter },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className="text-[#B5B5B5]" />
                        <span className="text-base text-[#B5B5B5]">{item.label}</span>
                      </div>
                      <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Wallet */}
            {currentView === "add-new-wallet" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Add New Wallet
                </h2>

                <div className="space-y-6">
                  <p className="text-sm text-[#B5B5B5]">
                    Create a new wallet to manage your assets securely. You'll
                    be able to generate a new seed phrase and set up your
                    wallet.
                  </p>

                  <div className="flex flex-col gap-4">
                    <button className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-3">
                      <FiPlus size={20} />
                      Create New Wallet
                    </button>

                    <p className="text-xs text-center text-[#6E7873]">
                      By creating a wallet, you agree to our Terms & Conditions
                      and Privacy Policy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Import Wallet */}
            {currentView === "import-wallet" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  Import Wallet
                </h2>

                <div className="space-y-6">
                  <p className="text-sm text-[#B5B5B5]">
                    Import an existing wallet using your recovery phrase or
                    private key. Make sure you're in a secure location.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-[#B5B5B5] mb-2 block">
                        Recovery Phrase or Private Key
                      </label>
                      <textarea
                        placeholder="Enter your recovery phrase or private key"
                        rows={4}
                        className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128] resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#B5B5B5] mb-2 block">
                        Wallet Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter a name for this wallet"
                        className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                      />
                    </div>

                    <button className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-3">
                      <FiUpload size={20} />
                      Import Wallet
                    </button>

                    <p className="text-xs text-center text-[#6E7873]">
                      By importing a wallet, you agree to our Terms & Conditions
                      and Privacy Policy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Disconnect Wallet */}
            {currentView === "disconnect-wallet" && (
              <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <div className="space-y-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 rounded-full bg-[#081F02] border-2 border-[#B1F128] flex items-center justify-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-[#B1F128]"
                      >
                        <path
                          d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold text-white">
                    Disconnect Wallet
                  </h2>

                  <p className="text-sm text-[#B5B5B5]">
                    You'll need your seed phrase to access the wallet again.
                  </p>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        // Handle PIN entry - for now just go back
                        handleGoBack();
                      }}
                      className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                    >
                      Enter Pin
                    </button>
                    <button
                      onClick={handleGoBack}
                      className="flex-1 bg-transparent border-2 border-[#B1F128] text-[#B1F128] font-semibold py-4 px-6 rounded-full hover:bg-[#081F02] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DesktopSettingsView>
        </div>
      </div>
    </div>
  );
}

