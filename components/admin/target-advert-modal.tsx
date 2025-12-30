"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline } from "react-icons/io5";

interface TargetAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertId?: string;
}

const audienceTargeting = ["All Users", "By Network", "By Activity", "By Token Holder", "By Region"];
const advertBudgets = ["Low", "Medium", "High", "Premium"];
const priorityLevels = ["Top Ad", "Mid Ad", "Low Ad"];

export default function TargetAdvertModal({
  open,
  onOpenChange,
  advertId,
}: TargetAdvertModalProps) {
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notification, setNotification] = useState("");
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const audienceRef = useRef<HTMLDivElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(event.target as Node)) {
        setShowAudienceDropdown(false);
      }
      if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) {
        setShowBudgetDropdown(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Target
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b5b5b5] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audience Targeting */}
          <div className="relative" ref={audienceRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Audience Targeting
            </label>
            <button
              onClick={() => {
                setShowAudienceDropdown(!showAudienceDropdown);
                setShowBudgetDropdown(false);
                setShowPriorityDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{audience || "Select audience"}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showAudienceDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {audienceTargeting.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setAudience(item);
                      setShowAudienceDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advert Budget */}
          <div className="relative" ref={budgetRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              ADVERT Budget
            </label>
            <button
              onClick={() => {
                setShowBudgetDropdown(!showBudgetDropdown);
                setShowAudienceDropdown(false);
                setShowPriorityDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{budget || "Select budget"}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showBudgetDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {advertBudgets.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setBudget(item);
                      setShowBudgetDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Level */}
          <div className="relative" ref={priorityRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Priority Level
            </label>
            <button
              onClick={() => {
                setShowPriorityDropdown(!showPriorityDropdown);
                setShowAudienceDropdown(false);
                setShowBudgetDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={priority === "Top Ad"}
                  readOnly
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span>{priority || "Select priority"}</span>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showPriorityDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {priorityLevels.map((level) => (
                  <label
                    key={level}
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="priorityLevel"
                      checked={priority === level}
                      onChange={() => {
                        setPriority(level);
                        setShowPriorityDropdown(false);
                      }}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Dates */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Campaign Dates
            </label>
            <textarea
              value={`Start Date (DD-MM-YYYY)\n${startDate || ""}\n\nEnd Date (DD-MM-YYYY)\n${endDate || ""}`}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                if (lines.length >= 2) {
                  setStartDate(lines[1]?.trim() || "");
                }
                if (lines.length >= 4) {
                  setEndDate(lines[3]?.trim() || "");
                }
              }}
              rows={5}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none font-mono text-sm"
              placeholder="Start Date (DD-MM-YYYY)&#10;&#10;End Date (DD-MM-YYYY)"
            />
          </div>

          {/* Notification */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Notification
            </label>
            <textarea
              value={notification}
              onChange={(e) => setNotification(e.target.value)}
              rows={3}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
              placeholder="Send notification to users"
            />
          </div>

          {/* Target Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              Target
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

