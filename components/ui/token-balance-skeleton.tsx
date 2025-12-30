/**
 * Token Balance Skeleton Component
 * 
 * Skeleton loader for token balance in swap card
 */

import Skeleton from './skeleton';

export default function TokenBalanceSkeleton() {
  return (
    <div className="flex flex-col items-end justify-center min-w-0 flex-1 max-w-full">
      <div className="flex items-center gap-0.5 h-7 sm:h-8 mb-1.5 sm:mb-2 w-full justify-end">
        <Skeleton width={80} height={16} rounded="sm" className="sm:w-[120px]" />
      </div>
      <Skeleton
        width={120}
        height={32}
        rounded="sm"
        className="mb-0.5 sm:mb-1 sm:w-[140px] lg:w-[160px]"
      />
      <Skeleton width={60} height={14} rounded="sm" className="w-full max-w-[80px]" />
    </div>
  );
}

