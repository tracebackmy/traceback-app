'use client';

import React, { useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({ 
  loadMore, 
  hasMore, 
  isLoading, 
  children 
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  return (
    <>
      {children}
      {(hasMore || isLoading) && (
        <div ref={observerTarget} className="w-full flex justify-center py-8">
          {isLoading && (
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
          )}
        </div>
      )}
    </>
  );
};