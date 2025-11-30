
'use client';

import React from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-red-800 mb-2">Admin Dashboard Error</h3>
        <p className="text-red-600 mb-6">{error.message || "An unexpected error occurred in the admin panel."}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
        >
          Retry Action
        </button>
      </div>
    </div>
  );
}
