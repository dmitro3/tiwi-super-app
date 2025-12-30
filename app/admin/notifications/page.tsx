"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import CreateNotificationModal from "@/components/admin/create-notification-modal";
import {
  IoSearchOutline,
  IoAddOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

const notifications = [
  {
    date: "01/11/2025",
    title: "Scheduled Maintenance",
    messageBody: "We will be performing scheduled maintenance on our systems on January 15, 2025. During this time, some services may be temporarily unavailable. We apologize for any inconvenience.",
    status: "Live",
    targetAudience: "All Users",
    deliveryType: "Modal Alert + Push Notification",
    priority: "Critical",
  },
  {
    date: "01/11/2025",
    title: "Network Performance Issue",
    messageBody: "We've detected a network performance issue affecting some users. Our team is actively working to resolve this. Thank you for your patience.",
    status: "Live",
    targetAudience: "By Network",
    deliveryType: "In-app Banner",
    priority: "Important",
  },
  {
    date: "01/11/2025",
    title: "All Systems Operational",
    messageBody: "All systems are now operational. Thank you for your patience during the recent maintenance period.",
    status: "Live",
    targetAudience: "All Users",
    deliveryType: "Push Notification",
    priority: "Normal",
  },
  {
    date: "01/11/2025",
    title: "New Staking Pool Available",
    messageBody: "A new high-yield staking pool is now available. Start earning rewards immediately by staking your tokens.",
    status: "Live",
    targetAudience: "By Token Holder",
    deliveryType: "Modal Alert + Push Notification",
    priority: "Normal",
  },
];

const filters = ["All", "Live", "Removed"];

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "text-[#ff5c5c]";
      case "Important":
        return "text-[#ffa500]";
      default:
        return "text-white";
    }
  };

  return (
    <AdminLayout pageTitle="Admin - Notifications" activeNavItem="notifications">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* User Notifications Section */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            User Notifications
          </h2>
          <p className="text-[#b5b5b5] text-xs lg:text-sm">
            Send real-time or scheduled notifications to inform users about important updates.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 lg:mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
            <input
              type="text"
              placeholder="Search Notifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? "bg-[#b1f128] text-[#010501]"
                    : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Create Notifications Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium text-sm whitespace-nowrap"
          >
            <IoAddOutline className="w-5 h-5" />
            <span>Create Notifications</span>
          </button>
        </div>

        {/* Notifications Table */}
        <div className="bg-[#121712] border border-[#1f261e] rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f261e]">
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Title
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Message Body
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Target Audience
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Delivery Type
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#1f261e] last:border-b-0 hover:bg-[#0b0f0a] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-white text-sm">{notification.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium text-sm">{notification.title}</span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-[#b5b5b5] text-sm line-clamp-2">
                        {notification.messageBody}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#b5b5b5] text-sm">{notification.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#b5b5b5] text-sm">{notification.targetAudience}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#b5b5b5] text-sm">{notification.deliveryType}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium text-sm ${getPriorityColor(notification.priority)}`}>
                        {notification.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table View */}
          <div className="lg:hidden divide-y divide-[#1f261e]">
            {notifications.map((notification, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm mb-1">
                      {notification.title}
                    </div>
                    <div className="text-[#7c7c7c] text-xs mb-2">{notification.date}</div>
                    <p className="text-[#b5b5b5] text-xs mb-3 line-clamp-2">
                      {notification.messageBody}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[#7c7c7c] mb-1">Status</div>
                    <div className="text-[#b5b5b5]">{notification.status}</div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] mb-1">Priority</div>
                    <div className={getPriorityColor(notification.priority)}>
                      {notification.priority}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] mb-1">Target Audience</div>
                    <div className="text-[#b5b5b5]">{notification.targetAudience}</div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] mb-1">Delivery Type</div>
                    <div className="text-[#b5b5b5]">{notification.deliveryType}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center mt-4 lg:mt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IoChevronBackOutline className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 1
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 2
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 3
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              3
            </button>
            <span className="text-[#b5b5b5] px-2">...</span>
            <button
              onClick={() => setCurrentPage(100)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 100
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              100
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === 100}
              className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IoChevronForwardOutline className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create Notification Modal */}
        <CreateNotificationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      </main>
    </AdminLayout>
  );
}


