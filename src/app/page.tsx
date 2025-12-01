'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Item } from '@/types';
import { Navbar } from '@/components/Navbar';
import ItemCard from '@/components/features/ItemCard';

export default function Home() {
  const router = useRouter();
  const [recentItems, setRecentItems] = useState<Item[]>([]);

  useEffect(() => {
    db.getItems().then(items => {
        setRecentItems(items.slice(0, 4));
    });
  }, []);

  const handleCategoryClick = (cat: string) => {
    router.push('/browse'); 
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow w-full">
        {/* HERO */}
        <section className="relative max-w-[1200px] mx-auto mt-5 w-full px-5 md:px-0">
          <div className="relative rounded-2xl overflow-hidden h-[420px] shadow-soft group">
              <Image 
                  src="/MRT3.jpg" 
                  alt="City transit scene" 
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-black/45 pointer-events-none"></div>
              
              <div className="absolute left-6 bottom-8 md:left-10 md:bottom-10 text-white z-10 max-w-lg">
                  <h2 className="m-0 mb-2 text-4xl md:text-[42px] font-extrabold leading-tight drop-shadow-lg">
                      Find it. Return it.<br/>Feel good.
                  </h2>
                  <p className="text-lg md:text-xl font-medium opacity-95 mb-6 drop-shadow-md">
                      TraceBack connects people to the things they miss — fast, friendly, and secure.
                  </p>
                  <div className="flex gap-3">
                      <Link href="/browse" className="px-6 py-3 bg-white text-ink font-bold rounded-full hover:shadow-lg transition transform hover:-translate-y-1">
                          I Found Something
                      </Link>
                      <Link href="/report" className="px-6 py-3 bg-brand text-white font-bold rounded-full hover:bg-brand-600 hover:shadow-lg transition transform hover:-translate-y-1">
                          I Lost Something
                      </Link>
                  </div>
              </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="max-w-[1200px] mx-auto my-12 px-5 w-full">
          <h3 className="text-2xl font-bold mb-6 text-ink">How TraceBack works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <article className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft transition-transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="h-40 bg-gray-100 relative">
                    <Image src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1200&auto=format&fit=crop" alt="Search" fill className="object-cover" />
                  </div>
                  <div className="p-5 flex-grow">
                      <h4 className="text-lg font-bold mb-1">Report or Search</h4>
                      <p className="text-sm text-muted">Create a post for what you lost or browse what was found near you.</p>
                  </div>
              </article>
              <article className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft transition-transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="h-40 bg-gray-100 relative">
                    <Image src="https://images.unsplash.com/photo-1525186402429-b4ff38bedbec?q=80&w=1200&auto=format&fit=crop" alt="Chat" fill className="object-cover" />
                  </div>
                  <div className="p-5 flex-grow">
                      <h4 className="text-lg font-bold mb-1">Chat to Verify</h4>
                      <p className="text-sm text-muted">Built-in messaging helps confirm ownership safely and quickly.</p>
                  </div>
              </article>
              <article className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft transition-transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="h-40 bg-gray-100 relative">
                    <Image src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop" alt="Return" fill className="object-cover" />
                  </div>
                  <div className="p-5 flex-grow">
                      <h4 className="text-lg font-bold mb-1">Reunite & Close</h4>
                      <p className="text-sm text-muted">Meet at a safe location, mark it as returned, and spread the joy.</p>
                  </div>
              </article>
          </div>
        </section>

        {/* BROWSE CATEGORIES */}
        <section className="max-w-[1200px] mx-auto my-12 px-5 w-full">
          <h3 className="text-2xl font-bold mb-6 text-ink">Browse by category</h3>
          <div className="flex flex-wrap gap-3">
              {['Bags', 'Electronics', 'Cards & IDs', 'Clothing', 'Others'].map(cat => (
                  <button 
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className="px-5 py-3 border border-border rounded-full bg-white font-semibold cursor-pointer transition hover:bg-[#fff1f3] hover:border-[#ffd1db] text-ink"
                  >
                      {cat}
                  </button>
              ))}
          </div>
        </section>

        {/* RECENTLY REPORTED */}
        <section className="max-w-[1200px] mx-auto my-12 px-5 w-full">
          <h3 className="text-2xl font-bold mb-6 text-ink">Recently reported</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {recentItems.length === 0 ? (
                  <div className="col-span-4 text-center text-muted py-10">Loading recent items...</div>
              ) : (
                  recentItems.map(item => (
                      <ItemCard key={item.id} item={item} />
                  ))
              )}
          </div>
        </section>
      </main>

      <footer className="max-w-[1200px] mx-auto w-full py-12 px-5 mt-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
                <Image src="/TRACEBACK.png" alt="TraceBack" width={48} height={48} className="rounded-lg" />
                <div>
                    <h3 className="font-bold text-lg text-ink">TraceBack</h3>
                    <p className="text-muted text-sm">Lost & Found, Reimagined.</p>
                </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link href="/browse" className="hover:text-brand">Browse Items</Link></li>
                <li><Link href="/report" className="hover:text-brand">Report Lost</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <p className="text-sm text-muted mb-2">Emergency: 1-800-TRACE</p>
              <p className="text-sm text-muted">© 2025 TraceBack Systems.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}