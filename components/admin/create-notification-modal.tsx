"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoPaperPlaneOutline } from "react-icons/io5";

interface CreateNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const targetAudiences = [
  { label: "All Users", value: "all-users" },
  { label: "By Network", value: "by-network" },
  { label: "By Activity (Stakers)", value: "by-activity-stakers" },
  { label: "By Activity (LPs)", value: "by-activity-lps" },
  { label: "By Activity (DAO voters)", value: "by-activity-dao" },
];

const deliveryTypes = [
  { label: "Push Notification", value: "push" },
  { label: "In-app Banner", value: "banner" },
  { label: "Modal Alert", value: "modal" },
];

const priorities = [
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
  { label: "Critical (System alerts)", value: "critical" },
];

export default function CreateNotificationModal({
  open,
  onOpenChange,
}: CreateNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedTargetAudience, setSelectedTargetAudience] = useState("All Users");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState("Push Notification");
  const [selectedPriority, setSelectedPriority] = useState("Normal");
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (targetRef.current && !targetRef.current.contains(event.target as Node)) {
        setShowTargetDropdown(false);
      }
      if (deliveryRef.current && !deliveryRef.current.contains(event.target as Node)) {
        setShowDeliveryDropdown(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical (System alerts)":
        return "text-[#ff5c5c]";
      case "Important":
        return "text-[#ffa500]";
      default:
        return "text-white";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Create Notification
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors"
          >
            X Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="Enter notification title"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Message Body
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={6}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
              placeholder="Enter notification message"
            />
          </div>

          {/* Target Audience Dropdown */}
          <div className="relative" ref={targetRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Target Audience
            </label>
            <button
              onClick={() => {
                setShowTargetDropdown(!showTargetDropdown);
                setShowDeliveryDropdown(false);
                setShowPriorityDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{selectedTargetAudience}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showTargetDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg p-2">
                <div className="flex flex-wrap gap-2">
                  {targetAudiences.map((audience) => (
                    <button
                      key={audience.value}
                      onClick={() => {
                        setSelectedTargetAudience(audience.label);
                        setShowTargetDropdown(false);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedTargetAudience === audience.label
                          ? "bg-[#b1f128] text-[#010501]"
                          : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
                      }`}
                    >
                      {audience.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Type Dropdown */}
          <div className="relative" ref={deliveryRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Delivery Type
            </label>
            <button
              onClick={() => {
                setShowDeliveryDropdown(!showDeliveryDropdown);
                setShowTargetDropdown(false);
                setShowPriorityDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={selectedDeliveryType === "Push Notification"}
                  readOnly
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span>{selectedDeliveryType}</span>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showDeliveryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {deliveryTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={selectedDeliveryType === type.label}
                      onChange={() => {
                        setSelectedDeliveryType(type.label);
                        setShowDeliveryDropdown(false);
                      }}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative" ref={priorityRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Priority
            </label>
            <button
              onClick={() => {
                setShowPriorityDropdown(!showPriorityDropdown);
                setShowTargetDropdown(false);
                setShowDeliveryDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={selectedPriority === "Normal"}
                  readOnly
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span className={getPriorityColor(selectedPriority)}>{selectedPriority}</span>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showPriorityDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {priorities.map((priority) => (
                  <label
                    key={priority.value}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#121712] transition-colors cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="priority"
                      checked={selectedPriority === priority.label}
                      onChange={() => {
                        setSelectedPriority(priority.label);
                        setShowPriorityDropdown(false);
                      }}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                    />
                    <span className={getPriorityColor(priority.label)}>{priority.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send Notification Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              <IoPaperPlaneOutline className="w-5 h-5" />
              <span>Send Notification</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}





