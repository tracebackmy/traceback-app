
import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-brand/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-brand rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-lg font-bold text-ink animate-pulse">Loading TraceBack...</h2>
    </div>
  );
}
