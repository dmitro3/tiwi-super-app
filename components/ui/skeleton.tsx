/**
 * Base Skeleton Component
 * 
 * Provides shimmer animation for loading states
 */

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export default function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-[#1f261e] ${roundedClasses[rounded]} ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
    >
      <div className="h-full w-full bg-gradient-to-r from-[#1f261e] via-[#2a3229] to-[#1f261e] bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
}

