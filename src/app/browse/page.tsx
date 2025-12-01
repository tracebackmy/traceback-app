'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

interface Item {
  id: string
  title: string
  description: string
  category: string
  type: 'lost' | 'found'
  mode: string
  line: string
  stationId: string
  status: string
  imageUrls: string[]
  createdAt: unknown
}

function BrowseContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    mode: 'all',
    search: initialSearch
  })

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMM dd, yyyy')
    }
    return 'Unknown date'
  }

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      
      const conditions: any[] = [where('type', '==', 'found')]
      
      if (filters.mode !== 'all') {
        conditions.push(where('mode', '==', filters.mode))
      }

      const q = query(
        collection(db, 'items'), 
        ...conditions, 
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      let fetchedItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[]

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        fetchedItems = fetchedItems.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
        )
      }

      setItems(fetchedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Found Items</h1>
      <p className="text-gray-600 mb-8">
        Search through items found at stations to see if yours is here.
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Mode</label>
            <select
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
              className="form-input"
            >
              <option value="all">All Modes</option>
              <option value="MRT">MRT</option>
              <option value="LRT">LRT</option>
              <option value="KTM">KTM</option>
              <option value="Monorail">Monorail</option>
              <option value="ERL">ERL</option>
            </select>
          </div>
          <div>
            <label className="form-label">Search</label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Keywords (e.g. iPhone)"
                className="form-input pl-10"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              <div className="h-48 bg-gray-100 relative flex items-center justify-center">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <Image
                    src={item.imageUrls[0]}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <span className="text-4xl mb-2">📷</span>
                    <span className="text-sm">No Image</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium uppercase tracking-wide">
                    Found
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-[#FF385C] transition-colors text-lg">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 flex items-center">
                   <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   {item.stationId}
                </p>
                <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
                   <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    {item.category}
                   </span>
                   <span className="text-sm text-[#FF385C] font-medium flex items-center">
                     View Details 
                     <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                   </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
           </div>
          <h3 className="text-xl font-semibold text-gray-900">No items found</h3>
          <p className="text-gray-500 mt-2">We couldn't find any matches. Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  )
}