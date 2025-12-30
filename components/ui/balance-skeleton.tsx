/**
 * Balance Skeleton Component
 * 
 * Skeleton loader for balance display with wallet icon
 */

import Skeleton from './skeleton';
import Image from 'next/image';

interface BalanceSkeletonProps {
  showIcon?: boolean;
  showMaxButton?: boolean;
}

export default function BalanceSkeleton({
  showIcon = true,
  showMaxButton = false,
}: BalanceSkeletonProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-end min-w-0">
      {showIcon && (
        <div className="relative shrink-0 size-3.5 sm:size-4">
          <Image
            src="/assets/icons/wallet.svg"
            alt="Wallet"
            width={16}
            height={16}
            className="w-full h-full object-contain opacity-50"
          />
        </div>
      )}
      <Skeleton
        width={60}
        height={16}
        rounded="sm"
        className="sm:w-[80px] md:w-[100px]"
      />
      {showMaxButton && (
        <Skeleton
          width={40}
          height={24}
          rounded="full"
          className="ml-2"
        />
      )}
    </div>
  );
}

