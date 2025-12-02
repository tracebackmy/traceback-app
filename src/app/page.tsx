'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
// Removed Image from 'next/image' as we are switching to img tag
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
  const [searchTerm, setSearchTerm] = useState('')
  const [recentItems, setRecentItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.location.href = `/browse?search=${encodeURIComponent(searchTerm)}`
    }
  }

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMM dd, yyyy')
    }
    return 'Unknown date'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden mb-12">
        <div className="absolute inset-0 bg-linear-to-r from-black/60 to-black/40 z-10"></div>
        <div 
          className="h-96 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80')`
          }}
        ></div>
        <div className="absolute inset-0 z-20 flex items-center">
          <div className="max-w-2xl mx-auto text-center text-white px-4">
            <h1 className="text-5xl font-bold mb-6">Find What You&apos;ve Lost</h1>
            <p className="text-xl mb-8 opacity-90">
              Traceback helps reunite people with their lost items across MRT, LRT, KTM, and other transit systems in Malaysia.
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for lost items (e.g., &apos;black backpack&apos;, &apos;iphone&apos;)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-gray-900"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] font-medium"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Recently Found Items */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recently Found Items</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                <div className="h-40 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
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
                    {item.mode} • {item.line}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recently found items to display.</p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How Traceback Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FF385C] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">Report or Search</h3>
            <p className="text-gray-600">Create a post for what you lost or browse what was found near you.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FF385C] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">Verify Details</h3>
            <p className="text-gray-600">Contact the finder and verify item details to ensure it&apos;s yours.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FF385C] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">Reunite</h3>
            <p className="text-gray-600">Arrange a safe meeting point to reclaim your lost item.</p>
          </div>
        </div>
      </section>
    </div>
  )
}