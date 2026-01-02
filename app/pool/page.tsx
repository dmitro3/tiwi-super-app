"use client";

import ComingSoonState from "@/components/earn/coming-soon-state";

export default function PoolPage() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] w-full px-4 py-8">
      <div className="w-full max-w-[880px]">
        <ComingSoonState className="h-[267px] w-full lg:h-[267px]" />
      </div>
    </div>
  );
}

