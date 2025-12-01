'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

interface Item {
  id: string
  title: string
  category: string
  type: 'lost' | 'found'
  mode: string
  line: string
  stationId: string
  createdAt: unknown
  imageUrls: string[]
}

export default function Home() {
  const [recentItems, setRecentItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
        // ONLY FETCH FOUND ITEMS
        const q = query(
          collection(db, 'items'),
          where('type', '==', 'found'),
          orderBy('createdAt', 'desc'),
          limit(4)
        )
        const querySnapshot = await getDocs(q)
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Item[]
        setRecentItems(items)
      } catch (error) {
        console.error('Error fetching recent items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentItems()
  }, [])

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMM dd, yyyy')
    }
    return 'Unknown date'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden mb-12 bg-gray-900">
         {/* Background Image Fallback */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10"></div>
        <div className="relative h-[500px] z-20 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Lost something <span className="text-[#FF385C]">valuable?</span>
            </h1>
            <p className="text-xl text-gray-200 mb-10 max-w-2xl">
              Traceback connects you with Lost & Found centers across major transit lines in Malaysia. Report your loss or check our found inventory.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
               <Link 
                 href="/report"
                 className="bg-[#FF385C] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#E31C5F] transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
               >
                 <span className="mr-2">📝</span> Report Lost Item
               </Link>
               <Link 
                 href="/browse"
                 className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
               >
                 <span className="mr-2">🔍</span> Browse Found Items
               </Link>
            </div>
        </div>
      </div>

      {/* Recently Found Items */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
           <h2 className="text-2xl font-bold text-gray-900">Recently Found</h2>
           <Link href="/browse" className="text-[#FF385C] font-medium hover:underline">View All →</Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse h-64"></div>
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="h-48 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <Image
                      src={item.imageUrls[0]}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">No Image</div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold text-gray-700">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-[#FF385C]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                    {item.stationId}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                      {item.category}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                      {item.mode}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-500">No recently found items to display.</p>
          </div>
        )}
      </section>
    </div>
  )
}