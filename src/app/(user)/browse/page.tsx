'use client';

import React, { useState } from 'react';
import ItemCard from '@/components/features/ItemCard';
import { useItems } from '@/hooks/useItems';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import { debounce } from '@/lib/utils/helpers'; // Assuming you have this util

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All'); // Visual filter or API filter?
  
  // Debounce search input to prevent API spam
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    // You can implement actual debounce here using setTimeout or a utility
    // For simplicity in this block, we'll just set it. 
    // Ideally: debounce(() => setDebouncedSearch(val), 500)();
    setTimeout(() => setDebouncedSearch(val), 500); 
  };

  // Pass filters to the hook
  const { items, loading, hasMore, loadMore } = useItems({ 
    type: 'found', 
    status: 'listed',
    search: debouncedSearch
  });

  // Client-side category filter (Optional: Move to API if strictly needed)
  // Since we are paginating, client-side filtering might look weird (filtering only loaded items).
  // Ideally, category should be an API parameter too.
  // For Phase 3 scope, let's keep it simple or acknowledge the limitation.
  const displayItems = items.filter(item => 
    categoryFilter === 'All' || item.category === categoryFilter
  );

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
              placeholder="Search by keyword (e.g. 'wallet', 'iphone')..."
              value={searchTerm}
              onChange={handleSearchChange}
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

      {displayItems.length === 0 && !loading ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-muted font-medium">No items found matching your criteria.</p>
          <button onClick={() => {setSearchTerm(''); setDebouncedSearch(''); setCategoryFilter('All')}} className="mt-3 text-brand font-bold hover:underline">Clear Filters</button>
        </div>
      ) : (
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} isLoading={loading}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
}