"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { IoArrowBack, IoChevronForward, IoChevronDown, IoRefresh, IoBugOutline } from "react-icons/io5";
import { FiCopy, FiCheck, FiDownload, FiTrash2, FiFile, FiSettings, FiMail, FiSend, FiPlus, FiUpload } from "react-icons/fi";
import { FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineCloudUpload } from "react-icons/hi";
import { HiExclamationTriangle } from "react-icons/hi2";
import { SettingsView } from "@/components/settings/types";
import MobileSettingsView from "@/components/settings/mobile-settings-view";
import DesktopSettingsView from "@/components/settings/desktop-settings-view";
import AddNewWallet from "@/components/settings/add-new-wallet";
import ImportWallet from "@/components/settings/import-wallet";
import ConnectedDevices from "@/components/settings/connected-devices";
import LanguageRegion from "@/components/settings/language-region";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { useActiveWalletAddress } from "@/lib/wallet/hooks/useActiveWalletAddress";
import { useSearchParams, useRouter } from "next/navigation";
import type { BugReport } from "@/lib/shared/types/bug-reports";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { useTranslation } from "@/lib/i18n/useTranslation";

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


function SettingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<SettingsView>("main");
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
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [logFile, setLogFile] = useState<File | null>(null);
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [bugSubmitSuccess, setBugSubmitSuccess] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [tutorialSearch, setTutorialSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [userBugReports, setUserBugReports] = useState<BugReport[]>([]);
  const [isLoadingBugReports, setIsLoadingBugReports] = useState(false);

  // FAQ state
  interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  }
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoadingFAQs, setIsLoadingFAQs] = useState(false);

  // Live Status state
  interface LiveStatus {
    id: string;
    service: string;
    status: 'operational' | 'degraded' | 'down' | 'maintenance';
    updatedAt: string;
  }
  const [liveStatuses, setLiveStatuses] = useState<LiveStatus[]>([]);
  const [isLoadingLiveStatuses, setIsLoadingLiveStatuses] = useState(false);

  // Tutorial state
  interface Tutorial {
    id: string;
    title: string;
    description: string;
    category: string;
    link: string;
    thumbnailUrl?: string;
    createdAt: string;
    updatedAt: string;
  }
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoadingTutorials, setIsLoadingTutorials] = useState(false);

  // Fetch FAQs from API
  const fetchFAQs = async () => {
    setIsLoadingFAQs(true);
    try {
      const response = await fetch("/api/v1/faqs");
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs || []);
      } else {
        console.error("Failed to fetch FAQs");
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setIsLoadingFAQs(false);
    }
  };

  // Fetch Tutorials from API
  const fetchTutorials = async () => {
    setIsLoadingTutorials(true);
    try {
      const response = await fetch("/api/v1/tutorials");
      if (response.ok) {
        const data = await response.json();
        setTutorials(data.tutorials || []);
      } else {
        console.error("Failed to fetch tutorials");
      }
    } catch (error) {
      console.error("Error fetching tutorials:", error);
    } finally {
      setIsLoadingTutorials(false);
    }
  };

  // Fetch Live Statuses from API
  const fetchLiveStatuses = async () => {
    setIsLoadingLiveStatuses(true);
    try {
      const response = await fetch("/api/v1/live-status");
      if (response.ok) {
        const data = await response.json();
        setLiveStatuses(data.statuses || []);
      } else {
        console.error("Failed to fetch live statuses");
      }
    } catch (error) {
      console.error("Error fetching live statuses:", error);
    } finally {
      setIsLoadingLiveStatuses(false);
    }
  };

  // Fetch FAQs when FAQs view is active
  useEffect(() => {
    if (currentView === "faqs") {
      fetchFAQs();
    }
  }, [currentView]);

  // Fetch Tutorials when tutorials view is active
  useEffect(() => {
    if (currentView === "tutorials") {
      fetchTutorials();
    }
  }, [currentView]);

  // Fetch Live Statuses when live-status view is active
  useEffect(() => {
    if (currentView === "live-status") {
      fetchLiveStatuses();
    }
  }, [currentView]);

  // Helper functions for live status display
  const getStatusColor = (status: LiveStatus['status']) => {
    switch (status) {
      case "operational":
        return "bg-[#4ade80] text-[#010501]";
      case "degraded":
      case "maintenance":
        return "bg-yellow-500 text-[#010501]";
      case "down":
        return "bg-[#ff5c5c] text-white";
      default:
        return "bg-[#7c7c7c] text-white";
    }
  };

  const getStatusLabel = (status: LiveStatus['status']) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded";
      case "down":
        return "Down";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  const wallet = useWallet();
  const activeAddress = useActiveWalletAddress();
  const getActiveManagedWallet = useWalletManagerStore((s) => s.getActiveWallet);
  const addOrUpdateManagedWallet = useWalletManagerStore(
    (s) => s.addOrUpdateWallet
  );
  const removeManagedWallet = useWalletManagerStore((s) => s.removeWallet);

  const activeManagedWallet = getActiveManagedWallet();

  const sourceLabelMap: Record<string, string> = {
    local: "Local",
    metamask: "MetaMask",
    walletconnect: "WalletConnect",
    coinbase: "Coinbase",
    rabby: "Rabby",
    phantom: "Phantom",
    other: "Wallet",
  };

  const isLocalActiveWallet = !!activeManagedWallet?.isLocal;
  const walletSourceLabel = activeManagedWallet
    ? sourceLabelMap[activeManagedWallet.source] || "Wallet"
    : undefined;

  const walletAddress =
    activeManagedWallet?.address ||
    activeAddress ||
    wallet.address ||
    "";
  const fullWalletAddress =
    activeManagedWallet?.address ||
    activeAddress ||
    wallet.address ||
    "";

  // TODO: Wire this to the real decrypted key for the active local wallet (never for external).
  const privateKey =
    "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";

  const hasWalletConnected = !!(
    activeManagedWallet ||
    activeAddress ||
    wallet.address
  );
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const logFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user bug reports
  useEffect(() => {
    const fetchUserBugReports = async () => {
      if (!wallet.address) {
        setUserBugReports([]);
        return;
      }

      setIsLoadingBugReports(true);
      try {
        const response = await fetch(
          `/api/v1/bug-reports?userWallet=${encodeURIComponent(wallet.address)}`
        );
        if (response.ok) {
          const data = await response.json();
          setUserBugReports(data.bugReports || []);
        }
      } catch (error) {
        console.error("Error fetching user bug reports:", error);
      } finally {
        setIsLoadingBugReports(false);
      }
    };

    // Fetch when wallet is connected or when viewing bug reports
    if (currentView === "view-bug-reports" || currentView === "report-bug" || currentView === "create-bug-report") {
      fetchUserBugReports();

      // Set up polling to refresh bug reports every 30 seconds when viewing
      if (currentView === "view-bug-reports") {
        const interval = setInterval(() => {
          fetchUserBugReports();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
      }
    }
  }, [wallet.address, currentView]);

  // Get bug report counts by status
  const getBugReportCounts = () => {
    const counts = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
      total: userBugReports.length,
    };

    userBugReports.forEach((report) => {
      counts[report.status] = (counts[report.status] || 0) + 1;
    });

    return counts;
  };

  const bugReportCounts = getBugReportCounts();

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle bug report submission
  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) {
      alert("Please describe the issue before submitting.");
      return;
    }

    if (!wallet.address) {
      alert("Please connect your wallet to submit a bug report.");
      return;
    }

    setIsSubmittingBug(true);
    setBugSubmitSuccess(false);

    try {
      // Convert files to base64 if they exist
      let screenshotBase64: string | undefined;
      let logFileBase64: string | undefined;

      if (screenshot) {
        screenshotBase64 = await fileToBase64(screenshot);
      }

      if (logFile) {
        logFileBase64 = await fileToBase64(logFile);
      }

      // Get device info if enabled
      const deviceInfo = sendDeviceInfo
        ? {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
        }
        : undefined;

      // Submit bug report
      const response = await fetch("/api/v1/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userWallet: wallet.address,
          description: bugDescription,
          screenshot: screenshotBase64,
          logFile: logFileBase64,
          deviceInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit bug report");
      }

      // Success
      setBugSubmitSuccess(true);
      setBugDescription("");
      setScreenshot(null);
      setLogFile(null);
      setSendDeviceInfo(false);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setBugSubmitSuccess(false);
        setCurrentView("view-bug-reports");
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      alert(error.message || "Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const handleSaveWalletName = () => {
    const name = newWalletName.trim();
    if (!name) return;

    const active = getActiveManagedWallet();
    if (!active) return;

    if (!active.isLocal) {
      alert("You can only rename local TIWI wallets.");
      return;
    }

    addOrUpdateManagedWallet({
      id: active.id,
      address: active.address,
      source: active.source,
      isLocal: active.isLocal,
      label: name,
    });

    setNewWalletName("");
    setCurrentView("main");
  };

  const handleGoBack = () => {
    if (
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
      currentView === "view-bug-reports" ||
      currentView === "create-bug-report" ||
      currentView === "contact-support"
    ) {
      if (currentView === "view-bug-reports" || currentView === "create-bug-report") {
        setCurrentView("report-bug");
      } else {
        setCurrentView("support");
      }
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
  };

  const { t } = useTranslation();

  const settingsMenuItems = [
    { label: t("settings.account_details"), view: "main" as SettingsView },
    { label: t("settings.connected_devices"), view: "connected-devices" as SettingsView },
    { label: t("settings.language_region"), view: "language-region" as SettingsView },
    { label: t("settings.notifications"), view: "notifications" as SettingsView },
    { label: t("settings.support"), view: "support" as SettingsView },
    { label: t("settings.add_new_wallet"), view: "add-new-wallet" as SettingsView },
    { label: t("settings.import_wallet"), view: "import-wallet" as SettingsView },
  ];

  const chainIconsList = chainIcons;

  return (
    <div className="min-h-screen bg-transparent text-white font-manrope">
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileSettingsView
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            try {
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              params.set("view", view);
              router.replace(`/settings?${params.toString()}`);
            } catch { }
          }}
          onGoBack={handleGoBack}
          walletName={
            hasWalletConnected
              ? activeManagedWallet?.label ||
              (activeManagedWallet
                ? activeManagedWallet.isLocal
                  ? "Local Wallet"
                  : walletSourceLabel || "Wallet"
                : "Wallet")
              : "No wallet connected"
          }
          walletAddress={walletAddress}
          chainIcons={chainIconsList}
          hasWallet={hasWalletConnected}
          isLocalWallet={isLocalActiveWallet}
          walletSourceLabel={walletSourceLabel}
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
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          {/* <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
            {currentView === "main"
              ? "Settings/Account Details"
              : currentView === "edit-wallet-name"
              ? "Edit Wallet Name"
              : currentView === "connected-devices"
              ? "Settings/Connected Devices"
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
          </div> */}

          <DesktopSettingsView
            currentView={currentView}
            onViewChange={(view) => {
              setCurrentView(view);
              try {
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.set("view", view);
                router.replace(`/settings?${params.toString()}`);
              } catch { }
            }}
            walletName={
              hasWalletConnected
                ? activeManagedWallet?.label ||
                (activeManagedWallet
                  ? activeManagedWallet.isLocal
                    ? "Local Wallet"
                    : walletSourceLabel || "Wallet"
                  : "Wallet")
                : "No wallet connected"
            }
            walletAddress={walletAddress}
            chainIcons={chainIconsList}
            hasWallet={hasWalletConnected}
            isLocalWallet={isLocalActiveWallet}
            walletSourceLabel={walletSourceLabel}
          >

            {/* Edit Wallet Name View */}
            {currentView === "edit-wallet-name" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("wallet.edit_name")}
                </h2>

                <div className="space-y-6">
                  {/* Old Wallet Name - Non-editable */}
                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      {t("wallet.current_name")}
                    </label>
                    <input
                      type="text"
                      value={
                        activeManagedWallet?.label ||
                        (activeManagedWallet
                          ? activeManagedWallet.isLocal
                            ? "Local Wallet"
                            : walletSourceLabel || "Wallet"
                          : "Wallet")
                      }
                      readOnly
                      disabled
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-[#6E7873] cursor-not-allowed opacity-60"
                    />
                  </div>

                  {/* New Wallet Name - Editable */}
                  <div>
                    <label className="text-sm text-[#B5B5B5] mb-2 block">
                      {t("wallet.new_name")}
                    </label>
                    <input
                      type="text"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      placeholder={t("wallet.enter_new_name")}
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>

                  <button
                    onClick={handleSaveWalletName}
                    disabled={!newWalletName.trim()}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("wallet.save")}
                  </button>
                </div>
              </div>
            )}

            {/* Export Private Key Warning */}
            {currentView === "export-private-key-warning" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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

            {/* Connected Devices */}
            {currentView === "connected-devices" && (
              <ConnectedDevices
                onViewChange={setCurrentView}
                onGoBack={handleGoBack}
              />
            )}

            {/* Terminate Device Confirmation */}

            {/* Language & Region */}
            {currentView === "language-region" && (
              <LanguageRegion onGoBack={handleGoBack} />
            )}

            {/* Notifications Main View */}
            {currentView === "notifications" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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

            {/* Support Main View */}
            {currentView === "support" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.title")}
                </h2>

                <div className="space-y-3">
                  {[
                    { label: t("support.live_status"), view: "live-status" },
                    { label: t("support.faqs"), view: "faqs" },
                    { label: t("support.tutorials"), view: "tutorials" },
                    { label: t("support.report_bug"), view: "report-bug" },
                    { label: t("support.contact_support"), view: "contact-support" },
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
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.live_status")}
                </h2>

                {isLoadingLiveStatuses ? (
                  <div className="text-center py-12">
                    <p className="text-[#B5B5B5]">Loading live statuses...</p>
                  </div>
                ) : liveStatuses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#B5B5B5]">No live statuses available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]"
                      >
                        <span className="text-base text-[#B5B5B5]">{status.service}</span>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}
                        >
                          {getStatusLabel(status.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAQs */}
            {currentView === "faqs" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.faqs")}
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search FAQs by question, answer, or category..."
                    className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                  />

                  {isLoadingFAQs ? (
                    <div className="text-center py-12">
                      <p className="text-[#B5B5B5]">Loading FAQs...</p>
                    </div>
                  ) : (() => {
                    // Filter FAQs based on search term
                    const searchTerm = faqSearch.toLowerCase().trim();
                    const filteredFAQs = searchTerm
                      ? faqs.filter((faq) =>
                        faq.question.toLowerCase().includes(searchTerm) ||
                        faq.answer.toLowerCase().includes(searchTerm) ||
                        faq.category.toLowerCase().includes(searchTerm)
                      )
                      : faqs;

                    if (filteredFAQs.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-[#B5B5B5]">
                            {searchTerm ? "No FAQs found matching your search." : "No FAQs available."}
                          </p>
                        </div>
                      );
                    }

                    return filteredFAQs.map((faq) => (
                      <div
                        key={faq.id}
                        className="bg-[#010501] rounded-xl border border-[#1f261e] overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedFaq(
                              expandedFaq === faq.id ? null : faq.id
                            )
                          }
                          className="w-full flex items-center justify-between py-4 px-4 hover:bg-[#121712] transition-colors text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-base text-[#B5B5B5] font-medium">
                                {faq.question}
                              </span>
                              <span className="px-2 py-0.5 bg-[#0b0f0a] border border-[#1f261e] rounded text-[#7c7c7c] text-xs">
                                {faq.category}
                              </span>
                            </div>
                          </div>
                          <IoChevronDown
                            size={20}
                            className={`text-[#B5B5B5] opacity-60 transition-transform shrink-0 ml-2 ${expandedFaq === faq.id ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                        {expandedFaq === faq.id && (
                          <div className="px-4 pb-4 pt-2 border-t border-[#1f261e]">
                            <p className="text-sm text-[#B5B5B5] leading-relaxed whitespace-pre-wrap">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Tutorials */}
            {currentView === "tutorials" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.tutorials")}
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={tutorialSearch}
                    onChange={(e) => setTutorialSearch(e.target.value)}
                    placeholder="Search tutorials..."
                    className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                  />

                  {isLoadingTutorials ? (
                    <div className="text-center py-12">
                      <p className="text-[#B5B5B5]">Loading tutorials...</p>
                    </div>
                  ) : (() => {
                    // Filter tutorials based on search term
                    const searchTerm = tutorialSearch.toLowerCase().trim();
                    const filteredTutorials = searchTerm
                      ? tutorials.filter((tutorial) => {
                        const titleMatch = tutorial.title?.toLowerCase().includes(searchTerm) || false;
                        const descMatch = tutorial.description?.toLowerCase().includes(searchTerm) || false;
                        const categoryMatch = tutorial.category?.toLowerCase().includes(searchTerm) || false;
                        return titleMatch || descMatch || categoryMatch;
                      })
                      : tutorials;

                    if (filteredTutorials.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-[#B5B5B5]">
                            {searchTerm ? "No tutorials found matching your search." : "No tutorials available."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {filteredTutorials.map((tutorial) => (
                          <a
                            key={tutorial.id}
                            href={tutorial.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-[200px] bg-[#010501] rounded-xl border border-[#1f261e] overflow-hidden hover:border-[#B1F128] transition-colors cursor-pointer flex flex-col"
                          >
                            {/* Thumbnail */}
                            {tutorial.thumbnailUrl ? (
                              <div className="w-full h-32 bg-[#121712] overflow-hidden">
                                <img
                                  src={tutorial.thumbnailUrl}
                                  alt={tutorial.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-[#121712] flex items-center justify-center">
                                <span className="text-[#6E7873] text-sm">No Image</span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-white font-medium text-sm flex-1">
                                  {tutorial.title}
                                </h3>
                                <span className="px-2 py-0.5 bg-[#0b0f0a] border border-[#1f261e] rounded text-[#7c7c7c] text-xs whitespace-nowrap">
                                  {tutorial.category}
                                </span>
                              </div>
                              <p className="text-xs text-[#B5B5B5] line-clamp-2 flex-1">
                                {tutorial.description}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Report Bug - Menu */}
            {currentView === "report-bug" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.report_bug")}
                </h2>

                <div className="space-y-4">
                  {/* View Bug Reports/History */}
                  <button
                    onClick={() => setCurrentView("view-bug-reports")}
                    className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <IoBugOutline className="text-[#B5B5B5] w-5 h-5" />
                      <div className="flex flex-col">
                        <span className="text-base text-[#B5B5B5]">
                          View Bug Reports
                        </span>
                        <span className="text-xs text-[#7c7c7c]">
                          Check status of your submitted reports
                        </span>
                      </div>
                    </div>
                    {bugReportCounts.total > 0 && (
                      <div className="flex items-center gap-2">
                        {bugReportCounts.pending > 0 && (
                          <span className="bg-[#ffa500] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            {bugReportCounts.pending}
                          </span>
                        )}
                        <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                      </div>
                    )}
                    {bugReportCounts.total === 0 && (
                      <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                    )}
                  </button>

                  {/* Create New Bug Report */}
                  <button
                    onClick={() => setCurrentView("create-bug-report")}
                    className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FiPlus className="text-[#B5B5B5] w-5 h-5" />
                      <div className="flex flex-col">
                        <span className="text-base text-[#B5B5B5]">
                          Create New Bug Report
                        </span>
                        <span className="text-xs text-[#7c7c7c]">
                          Submit a new bug report
                        </span>
                      </div>
                    </div>
                    <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
                  </button>
                </div>
              </div>
            )}

            {/* Create Bug Report Form */}
            {currentView === "create-bug-report" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full overflow-y-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => setCurrentView("report-bug")}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-4">
                  Create New Bug Report
                </h2>

                <p className="text-sm text-[#B5B5B5] mb-6">
                  Help us improve TIVI Protocol by reporting any issues you
                  encounter. Our team will review your report promptly.
                </p>

                <div className="space-y-6">
                  {/* Success Message */}
                  {bugSubmitSuccess && (
                    <div className="bg-[#081f02] border border-[#B1F128] rounded-xl p-4 text-center">
                      <p className="text-[#B1F128] text-sm font-medium">
                        Bug report submitted successfully! Thank you for helping us improve.
                      </p>
                    </div>
                  )}

                  {/* Attach Screenshot */}
                  <div className="border-2 border-dashed border-[#1f261e] rounded-xl p-8 text-center bg-[#010501]">
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setScreenshot(file);
                        }
                      }}
                    />
                    {screenshot ? (
                      <div className="space-y-3">
                        <p className="text-sm text-[#B1F128] font-medium">
                          {screenshot.name}
                        </p>
                        <button
                          onClick={() => {
                            setScreenshot(null);
                            if (screenshotInputRef.current) {
                              screenshotInputRef.current.value = "";
                            }
                          }}
                          className="text-[#ff5c5c] text-xs hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <HiOutlineCloudUpload
                          size={32}
                          className="text-[#B5B5B5] mx-auto mb-3"
                        />
                        <p className="text-sm text-[#B5B5B5] mb-3">
                          Drag or drop files here or browse your computer.
                        </p>
                        <button
                          onClick={() => screenshotInputRef.current?.click()}
                          className="bg-[#B1F128] text-[#010501] font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-sm"
                        >
                          Browse File
                        </button>
                        <p className="text-xs text-[#6E7873] mt-2">
                          Attach Screenshot (Recommended)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Add Log File */}
                  <div className="border-2 border-dashed border-[#1f261e] rounded-xl p-8 text-center bg-[#010501]">
                    <input
                      ref={logFileInputRef}
                      type="file"
                      accept=".log,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogFile(file);
                        }
                      }}
                    />
                    {logFile ? (
                      <div className="space-y-3">
                        <p className="text-sm text-[#B1F128] font-medium">
                          {logFile.name}
                        </p>
                        <button
                          onClick={() => {
                            setLogFile(null);
                            if (logFileInputRef.current) {
                              logFileInputRef.current.value = "";
                            }
                          }}
                          className="text-[#ff5c5c] text-xs hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <HiOutlineCloudUpload
                          size={32}
                          className="text-[#B5B5B5] mx-auto mb-3"
                        />
                        <p className="text-sm text-[#B5B5B5] mb-3">
                          Choose a log file to help us understand your issue.
                        </p>
                        <button
                          onClick={() => logFileInputRef.current?.click()}
                          className="bg-[#B1F128] text-[#010501] font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-sm"
                        >
                          Browse File
                        </button>
                        <p className="text-xs text-[#6E7873] mt-2">
                          Add Log File (Optional)
                        </p>
                      </>
                    )}
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
                  <button
                    onClick={handleSubmitBugReport}
                    disabled={isSubmittingBug || !bugDescription.trim()}
                    className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingBug ? "Submitting..." : "Submit Bug/Report"}
                  </button>

                  {!wallet.address && (
                    <p className="text-xs text-[#ff5c5c] text-center mt-2">
                      Please connect your wallet to submit a bug report.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contact Support */}
            {currentView === "contact-support" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    {t("settings.go_back")}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  {t("support.contact_support")}
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

            {/* View Bug Reports */}
            {currentView === "view-bug-reports" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full overflow-y-auto">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => setCurrentView("report-bug")}
                    className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
                  >
                    <IoArrowBack size={16} />
                    Go Back
                  </button>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-6">
                  My Bug Reports
                </h2>

                {!wallet.address ? (
                  <div className="text-center py-12">
                    <p className="text-[#B5B5B5] mb-4">Please connect your wallet to view your bug reports.</p>
                  </div>
                ) : isLoadingBugReports ? (
                  <div className="text-center py-12">
                    <p className="text-[#B5B5B5]">Loading your bug reports...</p>
                  </div>
                ) : userBugReports.length === 0 ? (
                  <div className="text-center py-12">
                    <IoBugOutline className="text-[#7c7c7c] w-16 h-16 mx-auto mb-4" />
                    <p className="text-[#B5B5B5] mb-4">You haven't submitted any bug reports yet.</p>
                    <button
                      onClick={() => setCurrentView("create-bug-report")}
                      className="text-[#B1F128] hover:underline"
                    >
                      Report a bug
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-[#ffa500] mb-1">
                          {bugReportCounts.pending}
                        </div>
                        <div className="text-xs text-[#B5B5B5]">Pending</div>
                      </div>
                      <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-[#4ade80] mb-1">
                          {bugReportCounts.reviewed}
                        </div>
                        <div className="text-xs text-[#B5B5B5]">Reviewed</div>
                      </div>
                      <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-[#4ade80] mb-1">
                          {bugReportCounts.resolved}
                        </div>
                        <div className="text-xs text-[#B5B5B5]">Resolved</div>
                      </div>
                      <div className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-[#7c7c7c] mb-1">
                          {bugReportCounts.dismissed}
                        </div>
                        <div className="text-xs text-[#B5B5B5]">Dismissed</div>
                      </div>
                    </div>

                    {/* Bug Reports List */}
                    {userBugReports.map((report) => {
                      const getStatusColor = (status: BugReport["status"]) => {
                        switch (status) {
                          case "pending":
                            return "bg-[#ffa500] text-white";
                          case "reviewed":
                            return "bg-[#4ade80] text-white";
                          case "resolved":
                            return "bg-[#4ade80] text-white";
                          case "dismissed":
                            return "bg-[#7c7c7c] text-white";
                          default:
                            return "bg-[#1f261e] text-[#B5B5B5]";
                        }
                      };

                      return (
                        <div
                          key={report.id}
                          className="bg-[#010501] border border-[#1f261e] rounded-xl p-4 hover:border-[#B1F128] transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    report.status
                                  )}`}
                                >
                                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </span>
                                <span className="text-xs text-[#7c7c7c]">
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-[#B5B5B5] line-clamp-3">
                                {report.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#7c7c7c]">
                            {report.screenshot && (
                              <span className="flex items-center gap-1">
                                📷 Screenshot
                              </span>
                            )}
                            {report.logFile && (
                              <span className="flex items-center gap-1">
                                📄 Log File
                              </span>
                            )}
                            {report.reviewedAt && (
                              <span className="ml-auto">
                                Reviewed: {new Date(report.reviewedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add New Wallet */}
            {currentView === "add-new-wallet" && (
              <div className="rounded-2xl rounded-l-none h-full">
                <AddNewWallet
                  onGoBack={handleGoBack}
                  onWalletCreated={(address) => {
                    // Wallet created successfully - could show notification or update UI
                    console.log("Wallet created:", address);
                  }}
                />
              </div>
            )}

            {/* Import Wallet */}
            {currentView === "import-wallet" && (
              <div className="rounded-2xl rounded-l-none h-full">
                <ImportWallet
                  onGoBack={handleGoBack}
                  onWalletImported={(address) => {
                    // Wallet imported successfully - could show notification or update UI
                    console.log("Wallet imported:", address);
                  }}
                />
              </div>
            )}

            {/* Disconnect Wallet */}
            {currentView === "disconnect-wallet" && (
              <div className="bg-[#0B0F0A] rounded-2xl rounded-l-none border border-[#1f261e] p-6 md:p-8 max-w-2xl mx-auto h-full">
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
                    {isLocalActiveWallet
                      ? "You'll need your recovery phrase or private key to access this wallet again."
                      : "You can reconnect this external wallet at any time from the Connect Wallet button."}
                  </p>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={async () => {
                        const active = getActiveManagedWallet();
                        if (!active) {
                          handleGoBack();
                          return;
                        }

                        // Disconnect the wallet connection
                        try {
                          await wallet.disconnect();
                        } catch (e) {
                          console.warn(
                            "[Settings] Failed to disconnect wallet:",
                            e
                          );
                        }

                        // Clear active wallet state to allow new connection
                        // This works like external wallets - disconnect and allow reconnection
                        const clearActiveWallet = useWalletManagerStore.getState().clearActiveWallet;
                        clearActiveWallet();

                        handleGoBack();
                      }}
                      className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
                    >
                      Confirm Disconnect
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent text-white font-manrope flex items-center justify-center">Loading...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}

