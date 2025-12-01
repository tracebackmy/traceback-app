
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: 'user' | 'admin') => {
    setLoading(true);
    const email = role === 'admin' ? 'admin@traceback.com' : 'user@demo.com';
    await db.login(email, role);
    refreshUser();
    setLoading(false);
    router.push(role === 'admin' ? '/admin/dashboard' : '/dashboard');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
       <div className="p-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <img src="/TRACEBACK.png" alt="TraceBack" className="w-10 h-10 rounded-lg" />
            <span className="font-extrabold text-xl text-brand">TraceBack</span>
          </Link>
       </div>
       <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-soft p-6 border border-border relative">
            <h4 className="text-center text-xl font-bold mb-6 text-ink">Log in to TraceBack</h4>
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-ink">Email</label>
                    <input type="email" disabled placeholder="user@demo.com" className="w-full p-3 bg-white border border-border rounded-xl outline-none focus:border-brand transition text-gray-900 font-medium" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-ink">Password</label>
                    <input type="password" disabled placeholder="••••••••" className="w-full p-3 bg-white border border-border rounded-xl outline-none focus:border-brand transition text-gray-900 font-medium" />
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => handleLogin('user')}
                        disabled={loading}
                        className="w-full p-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-600 transition shadow-lg shadow-brand/20 mb-3"
                    >
                        {loading ? 'Logging in...' : 'Continue as User'}
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                        <div className="relative flex justify-center text-xs text-muted"><span className="bg-white px-2">OR</span></div>
                    </div>

                    <button
                        onClick={() => handleLogin('admin')}
                        disabled={loading}
                        className="w-full p-3 rounded-xl border border-border bg-white text-ink font-bold hover:bg-gray-50 transition"
                    >
                        Log in as Admin
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
