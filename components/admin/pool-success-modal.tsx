"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { IoCheckmarkCircleOutline } from "react-icons/io5";

interface PoolSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolId?: string;
}

export default function PoolSuccessModal({
  open,
  onOpenChange,
  poolId = "1",
}: PoolSuccessModalProps) {
  const router = useRouter();

  const handleViewPool = () => {
    onOpenChange(false);
    router.push(`/admin/staking-pools/${poolId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-md"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <IoCheckmarkCircleOutline className="w-20 h-20 text-[#b1f128] mb-4" />
          <h3 className="text-2xl font-semibold text-white mb-6">
            Pool Created Successfully!
          </h3>
          <button
            onClick={handleViewPool}
            className="w-full px-6 py-3 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
          >
            View Pool
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

