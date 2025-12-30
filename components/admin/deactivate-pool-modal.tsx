"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface DeactivatePoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeactivatePoolModal({
  open,
  onOpenChange,
}: DeactivatePoolModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-md"
        showCloseButton={false}
      >
        <div className="py-6 px-6">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            Are you sure you want to deactivate this pool?
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-2.5 bg-[#121712] border border-[#1f261e] text-[#b5b5b5] rounded-lg hover:bg-[#1a1f1a] hover:text-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              Deactivate
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


