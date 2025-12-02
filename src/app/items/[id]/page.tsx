'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams } from 'next/navigation'
// Removed next/image as we are switching to standard img tag for stability
import { format } from 'date-fns'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

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
  claimStatus?: string
  imageUrls: string[]
  createdAt: unknown
  userId: string
}

export default function ItemDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMM dd, yyyy')
    }
    return 'Unknown date'
  }

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const docRef = doc(db, 'items', id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          setItem({
            id: docSnap.id,
            ...docSnap.data()
          } as Item)
        }
      } catch (error) {
        console.error('Error fetching item:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchItem()
  }, [id])

  if (loading) return <div className="p-12 text-center">Loading...</div>

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
        <Link href="/browse" className="text-[#FF385C] hover:underline">Back to Browse</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link href={item.type === 'lost' ? '/auth/dashboard' : '/browse'} className="text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Image Gallery */}
        <div className="h-96 bg-gray-100 relative flex items-center justify-center overflow-hidden">
          {item.imageUrls && item.imageUrls.length > 0 ? (
            /* Switch to standard img tag to match Admin page logic and bypass Next.js optimization issues */
            <img
              src={item.imageUrls[0]}
              alt={item.title}
              className="w-full h-full object-contain"
            />
          ) : (
             <div className="text-center text-gray-400">
               <span className="text-4xl block mb-2">📷</span>
               No Image Available
             </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
              <div className="flex gap-2">
                 <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                   item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                 }`}>
                   {item.type.toUpperCase()}
                 </span>
                 <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                   {item.category}
                 </span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
               <p>Reported on</p>
               <p className="font-medium text-gray-900">{formatDate(item.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
              <p className="text-lg font-medium text-gray-900">{item.stationId}</p>
              <p className="text-gray-600">{item.mode} • {item.line}</p>
            </div>
             <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{item.description}</p>
            </div>
          </div>

          {/* ACTION SECTION */}
          <div className="border-t border-gray-100 pt-6">
            
            {/* Case 1: Found Item (Claimable) */}
            {item.type === 'found' && (
              <>
                {item.status === 'open' && item.claimStatus !== 'claim-pending' && (
                  <div className="bg-green-50 border border-green-200 p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Is this yours?</h3>
                      <p className="text-green-800 text-sm">
                        If you recognize this item, submit a claim request to verify ownership.
                      </p>
                    </div>
                    <Link
                      href={`/items/${item.id}/claim`}
                      className="whitespace-nowrap bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                      Claim Item
                    </Link>
                  </div>
                )}

                {/* Case 2: Already Claimed / Pending */}
                {(item.status === 'claimed' || item.claimStatus === 'claim-pending') && (
                   <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                     <h3 className="text-yellow-800 font-semibold">Claim In Progress</h3>
                     <p className="text-yellow-700 text-sm">This item is currently being verified for another claim.</p>
                   </div>
                )}
              </>
            )}

            {/* Case 3: Lost Item (Owner View) */}
            {item.type === 'lost' && user?.uid === item.userId && (
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex justify-between items-center">
                 <span className="text-blue-800 font-medium">This is your reported item.</span>
                 <Link 
                    href={`/items/${item.id}/edit`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                 >
                   Edit Details
                 </Link>
               </div>
            )}

             {/* Case 4: Lost Item (Public View - Should technically be hidden by rules, but failsafe) */}
             {item.type === 'lost' && user?.uid !== item.userId && (
                <div className="text-center text-gray-500 italic">
                  This is a reported lost item. If you found it, please contact the station staff.
                </div>
             )}

          </div>
        </div>
      </div>
    </div>
  )
}