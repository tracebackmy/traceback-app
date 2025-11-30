'use client';

import React, { useState, useMemo } from 'react';
import ItemCard from '@/components/features/ItemCard';
import { useItems } from '@/hooks/useItems';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Use custom hook for data fetching
  const { items, loading, hasMore, loadMore } = useItems({ 
    type: 'found', 
    status: 'listed' 
  });

  // Client-side filtering for search/category (mockFirebase returns all usually, but hooks simulates pagination)
  // In a real API, these filters would be passed to the hook/API
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const categories = ['All', 'Electronics', 'Clothing', 'Personal Accessories', 'Documents', 'Bags', 'Other'];

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-ink">Browse Found Items</h1>
        <p className="text-muted mt-2">Search through items currently held at stations.</p>
      </div>

      {/* Filters Container */}
      <div className="bg-white p-5 rounded-2xl shadow-soft border border-border mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl leading-5 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
              placeholder="Search by name, color, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
           {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setCategoryFilter(cat)}
                 className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition
                    ${categoryFilter === cat 
                        ? 'bg-[#fff1f3] border-[#ffd1db] text-brand' 
                        : 'bg-white border-border text-ink hover:bg-gray-50'
                    }`}
               >
                 {cat}
               </button>
           ))}
        </div>
      </div>

      {filteredItems.length === 0 && !loading ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-muted font-medium">No items found matching your criteria.</p>
          <button onClick={() => {setSearchTerm(''); setCategoryFilter('All')}} className="mt-3 text-brand font-bold hover:underline">Clear Filters</button>
        </div>
      ) : (
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} isLoading={loading}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
}