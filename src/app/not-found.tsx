
import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-9xl font-extrabold text-brand/10 select-none">404</h1>
      <div className="absolute mt-[-2rem]">
         <h2 className="text-3xl font-bold text-ink mb-2">Page Not Found</h2>
      </div>
      <p className="text-muted mb-8 max-w-md mt-4">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link 
        href="/"
        className="px-8 py-3 bg-brand text-white font-bold rounded-full shadow-soft hover:bg-brand-600 transition"
      >
        Go Back Home
      </Link>
    </div>
  );
}
