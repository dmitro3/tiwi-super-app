"use client";

import { TableRow, TableCell } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 10 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <TableRow
          key={`skeleton-${idx}`}
          className="border-b border-[#1f261e]/60"
        >
          <TableCell className="w-[6.5rem] lg:w-[7rem] xl:w-[8.125rem] 2xl:w-[8.75rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4">
            <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3">
              <div className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 bg-[#1f261e] rounded animate-pulse" />
              <div className="w-5 h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 bg-[#1f261e] rounded-full animate-pulse" />
              <div className="h-4 lg:h-5 xl:h-6 w-12 lg:w-16 xl:w-20 bg-[#1f261e] rounded animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 w-16 lg:w-20 xl:w-24 bg-[#1f261e] rounded animate-pulse ml-auto" />
          </TableCell>
          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 w-12 lg:w-16 xl:w-20 bg-[#1f261e] rounded animate-pulse ml-auto" />
          </TableCell>
          <TableCell className="w-[5.5rem] lg:w-[6rem] xl:w-[6.875rem] 2xl:w-[7.5rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 w-14 lg:w-18 xl:w-22 bg-[#1f261e] rounded animate-pulse ml-auto" />
          </TableCell>
          <TableCell className="w-[5rem] lg:w-[5.5rem] xl:w-[6.5625rem] 2xl:w-[6.875rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 w-14 lg:w-18 xl:w-22 bg-[#1f261e] rounded animate-pulse ml-auto" />
          </TableCell>
          <TableCell className="w-[4.5rem] lg:w-[4.75rem] xl:w-[5.3125rem] 2xl:w-[5.625rem] px-3 lg:px-4 xl:px-5 2xl:px-6 py-2.5 lg:py-3 xl:py-4 text-right">
            <div className="h-4 lg:h-5 xl:h-6 w-10 lg:w-12 xl:w-14 bg-[#1f261e] rounded animate-pulse ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}


