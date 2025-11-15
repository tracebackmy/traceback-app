'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Item {
  id: string
  title: string
  category: string
  type: 'lost' | 'found'
  status: string
  createdAt: unknown
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMM dd, yyyy')
    }
    return 'Unknown date'
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchUserItems()
    }
  }, [user, authLoading, router])

  const fetchUserItems = async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'items'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const userItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[]
      setItems(userItems)
    } catch (error) {
      console.error('Error fetching user items:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard.</p>
          <Link href="/auth/login" className="bg-[#FF385C] text-white px-6 py-2 rounded-md hover:bg-[#E31C5F]">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.email}</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Report a lost or found item</p>
          </div>
          <Link
            href="/dashboard/report"
            className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium"
          >
            Report Lost/Found Item
          </Link>
        </div>
      </div>

      {/* User's Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Reported Items</h2>
        </div>
        
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">{item.category}</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.type}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        item.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'claimed' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
                    <Link 
                      href={`/items/${item.id}`} 
                      className="text-sm text-[#FF385C] hover:text-[#E31C5F]"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">You haven&apos;t reported any items yet.</p>
            <Link
              href="/dashboard/report"
              className="inline-block mt-2 text-[#FF385C] hover:text-[#E31C5F] font-medium"
            >
              Report your first item
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}