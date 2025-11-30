
import React from 'react';

export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
            {[1,2,3,4].map(i => (
                <div key={i} className="bg-white h-32 rounded-2xl border border-gray-100 p-5">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
            ))}
        </div>
        
        <div className="bg-white h-96 rounded-2xl border border-gray-100"></div>
      </div>
    </div>
  );
}
