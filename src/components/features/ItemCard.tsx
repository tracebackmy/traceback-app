'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Item } from '@/types';

interface ItemCardProps {
  item: Item;
}

const ItemCard = React.memo(({ item }: ItemCardProps) => {
  return (
    <Link href={`/items/${item.id}`} className="group block h-full">
      <article className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft transition-transform duration-200 group-hover:-translate-y-1 h-full flex flex-col">
        <div className="h-44 bg-gray-100 relative overflow-hidden">
          {item.imageUrls.length > 0 ? (
            <Image 
              src={item.imageUrls[0]} 
              alt={item.title} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-white/90 backdrop-blur-sm border border-black/5 
                ${item.itemType === 'found' ? 'text-green-700' : 'text-brand'}`}>
              {item.status}
            </span>
          </div>
        </div>
        
        <div className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[11px] font-bold text-brand uppercase tracking-wide">
              {item.category}
            </span>
            <span className="text-[11px] text-muted">{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          <h3 className="text-base font-bold text-ink truncate mb-1">{item.title}</h3>
          <p className="text-sm text-muted line-clamp-2 mb-4">{item.description}</p>
          
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center text-xs text-muted font-medium">
            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {item.stationId}
          </div>
        </div>
      </article>
    </Link>
  );
});

ItemCard.displayName = 'ItemCard';

export default ItemCard;