"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline } from "react-icons/io5";

interface ManageFAQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

const categories = [
  "General",
  "Transactions",
  "Chains",
  "Lending",
  "Staking",
  "Liquidity",
  "NFTs",
  "Referrals",
  "Security",
  "Troubleshooting",
];

export default function ManageFAQModal({
  open,
  onOpenChange,
  item,
}: ManageFAQModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item) {
      setQuestion(item.question || "");
      setAnswer(item.answer || "");
      setCategory(item.category || "General");
    } else {
      setQuestion("");
      setAnswer("");
      setCategory("General");
    }
  }, [item, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    // Here you would save to API
    console.log("Saving FAQ:", { question, answer, category });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            {item ? "Edit" : "Add"} FAQ
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors"
          >
            X Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="Enter question"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
              placeholder="Enter answer"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Category
            </label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{category}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg p-2">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        category === cat
                          ? "bg-[#b1f128] text-[#010501]"
                          : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={handleSubmit}
              disabled={!question || !answer}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{item ? "Update" : "Add"} FAQ</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



