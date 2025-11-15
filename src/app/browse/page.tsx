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

// Create a separate component that uses useSearchParams
function BrowseContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
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
      let q = query(collection(db, 'items'), orderBy('createdAt', 'desc'))

      // Apply filters
      const conditions: unknown[] = []
      if (filters.type !== 'all') {
        conditions.push(where('type', '==', filters.type))
      }
      if (filters.mode !== 'all') {
        conditions.push(where('mode', '==', filters.mode))
      }

      // Build query with conditions
      if (conditions.length > 0) {
        q = query(collection(db, 'items'), ...conditions as [], orderBy('createdAt', 'desc'))
      }

      const querySnapshot = await getDocs(q)
      let fetchedItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[]

      // Apply search filter
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Items</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
            <select
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search items..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            />
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
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <Image
                    src={item.imageUrls[0]}
                    alt={item.title}
                    width={400}
                    height={192}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400">No Image</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {item.category}
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {item.mode} • {item.line} • {item.stationId}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No items found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}

// Main page component with Suspense boundary
export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  )
}