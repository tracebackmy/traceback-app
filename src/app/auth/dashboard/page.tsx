'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Item, ItemStatus } from '@/types/item'
import { safeDateConvert } from '@/lib/date-utils' 


// NOTE: Since we are not using Firestore Converters, we manually define types here
interface UserItemDisplay extends Omit<Item, 'createdAt' | 'updatedAt'> {
  createdAt: { toDate: () => Date };
  updatedAt: { toDate: () => Date };
}


export default function DashboardPage() {
  const { user, loading: authLoading, uid } = useAuth()
  const [items, setItems] = useState<UserItemDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const formatDate = (date: unknown) => {
    try {
      const jsDate = safeDateConvert(date);
      return format(jsDate, 'MMM dd, yyyy');
    } catch {
      return 'Unknown date';
    }
  }
  
  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'reported': return 'bg-yellow-100 text-yellow-800';
      case 'match_found': return 'bg-blue-100 text-blue-800';
      case 'listed': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (uid) {
      // Use onSnapshot
      const q = query(
        collection(db, 'items'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserItemDisplay[]
        setItems(userItems)
        setLoading(false)
      }, (error) => {
        console.error('Error fetching real-time user items:', error)
        setLoading(false)
      })
      
      return () => unsubscribe();
    }
    setLoading(false);

  }, [uid, authLoading, router, user]) // Depend on uid instead of user

  if (loading || authLoading) {
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
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Report a lost item or check your claims/tickets.</p>
          </div>
          <div className='flex gap-3'>
            <Link
              href="/report"
              className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium"
            >
              Report Lost Item
            </Link>
            <Link
              href="/dashboard/tickets"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              View Tickets
            </Link>
          </div>
        </div>
      </div>

      {/* User's Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Reported Items & Claims</h2>
        </div>
        
        {items.length > 0 ? (
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
                      {/* Displaying Item Status */}
                      <span className={`text-sm px-2 py-1 rounded ${getStatusColor(item.status as ItemStatus)}`}>
                        {item.status.toUpperCase().replace('_', ' ')}
                      </span>
                      {/* Displaying Claim Status if present */}
                      {item.claimStatus && item.claimStatus !== 'unclaimed' && (
                        <span className="text-sm px-2 py-1 rounded bg-orange-100 text-orange-800">
                          Claim: {item.claimStatus.toUpperCase().replace('-', ' ')}
                        </span>
                      )}
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
            <p className="text-gray-500">You haven&apos;t reported any items or filed any claims yet.</p>
            <Link
              href="/report"
              className="inline-block mt-2 text-[#FF385C] hover:text-[#E31C5F] font-medium"
            >
              Report your first lost item
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}