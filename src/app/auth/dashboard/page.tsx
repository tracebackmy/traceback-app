'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Item } from '@/types/item'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    if (date.toDate) return format(date.toDate(), 'MMM dd, yyyy');
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
    return <div className="p-8 text-center">Loading dashboard...</div>
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.displayName || user.email}</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Report a lost or found item to help the community.</p>
          </div>
          <Link
            href="/auth/dashboard/report"
            className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium"
          >
            Report Item
          </Link>
        </div>
      </div>

      {/* User's Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Your Reports</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading your items...</div>
        ) : items.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-lg">{item.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>•</span>
                      <span className={`${
                        item.status === 'open' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        Status: {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* View Button */}
                    <Link 
                      href={`/items/${item.id}`} 
                      className="text-gray-600 hover:text-blue-600 text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-md hover:border-blue-300"
                    >
                      View
                    </Link>

                    {/* Edit Button - Only if status is open */}
                    {item.status === 'open' && (
                      <Link 
                        href={`/items/${item.id}/edit`} 
                        className="text-gray-600 hover:text-[#FF385C] text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-md hover:border-red-200"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t reported any items yet.</p>
            <Link
              href="/auth/dashboard/report"
              className="text-[#FF385C] hover:text-[#E31C5F] font-medium"
            >
              Report your first item →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}