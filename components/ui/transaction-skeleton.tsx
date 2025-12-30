/**
 * Transaction Skeleton Component
 * 
 * Skeleton loader for transaction list items
 */

import Skeleton from './skeleton';

export default function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 lg:px-4 xl:px-5 2xl:px-6 py-4 lg:py-3 xl:py-3.5 2xl:py-4 relative shrink-0 w-full">
      <div className="flex flex-col gap-1 lg:gap-0.5 xl:gap-0.5 2xl:gap-1 items-start justify-center min-h-0 min-w-0 relative shrink-0 w-[142px] lg:w-[103px] xl:w-[116px] 2xl:w-[142px]">
        <Skeleton width={80} height={20} rounded="sm" className="lg:w-[60px] xl:w-[70px] 2xl:w-[80px]" />
        <Skeleton width={100} height={16} rounded="sm" className="lg:w-[70px] xl:w-[80px] 2xl:w-[100px]" />
      </div>
      <div className="flex flex-col gap-1 lg:gap-0.5 xl:gap-0.5 2xl:gap-1 items-end justify-center relative shrink-0">
        <Skeleton width={80} height={20} rounded="sm" className="lg:w-[60px] xl:w-[70px] 2xl:w-[80px]" />
        <Skeleton width={60} height={16} rounded="sm" className="lg:w-[40px] xl:w-[50px] 2xl:w-[60px]" />
      </div>
    </div>
  );
}

