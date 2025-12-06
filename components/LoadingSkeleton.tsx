import React from 'react';

const LoadingSkeleton: React.FC = () => {
  const SkeletonBlock = ({ className }: { className?: string }) => (
    <div className={`bg-white/10 animate-pulse rounded-md ${className}`} />
  );

  return (
    <div className="space-y-4">
      {/* Current Conditions Skeleton */}
      <div className="flex items-center gap-6 p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-color)]">
        <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-12 w-1/2" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </div>

      {/* Detailed Metrics Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </div>

      {/* Text Skeleton */}
      <div className="space-y-2 pt-4">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
      </div>

      {/* Chart Skeleton */}
      <div className="w-full h-[28rem] mt-4 bg-[color:var(--bg-card)] rounded-lg p-4 border border-[color:var(--border-color)]">
        <div className="flex justify-between items-center mb-4">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-8 w-1/4" />
        </div>
        <SkeletonBlock className="w-full h-full" />
      </div>
    </div>
  );
};

export default LoadingSkeleton;
