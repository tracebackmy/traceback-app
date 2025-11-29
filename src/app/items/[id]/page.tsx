'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import Link from 'next/link'
import { Item, ItemStatus } from '@/types/item'
import { ItemClaimStatus } from '@/types/claim'
import { safeDateConvert } from '@/lib/date-utils'

// Since we are not using converters, we rely on manual date handling
interface ItemDisplay extends Omit<Item, 'createdAt'> {
  createdAt: { toDate: () => Date };
}

export default function ItemDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<ItemDisplay | null>(null)
  const [loading, setLoading] = useState(true)

  const formatDate = (date: unknown) => {
    try {
      const jsDate = safeDateConvert(date);
      return format(jsDate, 'MMMM dd, yyyy');
    } catch {
      return 'Unknown date';
    }
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
          } as ItemDisplay)
        } else {
          console.log('No such document!')
        }
      } catch (error) {
        console.error('Error fetching item:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchItem()
    }
  }, [id])
  
  const getStatusColor = (status: ItemStatus | ItemClaimStatus, isClaim = false) => {
    switch (status) {
      case 'listed': return 'bg-green-100 text-green-800';
      case 'reported': return 'bg-yellow-100 text-yellow-800';
      case 'match_found': return 'bg-blue-100 text-blue-800';
      case 'unclaimed': return 'bg-gray-100 text-gray-800';
      case 'claim-submitted': 
      case 'verification-chat': // New claim status
        return 'bg-orange-100 text-orange-800';
      case 'approved':
      case 'claimed':
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // --- UI Rendering remains the same for loading/not found ---
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
          <p className="text-gray-600">The item you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  // Determine button visibility based on claimStatus
  const canClaim = item.type === 'found' && item.claimStatus === 'unclaimed' && item.status === 'listed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Image Gallery */}
        <div className="h-96 bg-gray-200 relative">
          {item.imageUrls && item.imageUrls.length > 0 ? (
            <Image
              src={item.imageUrls[0]}
              alt={item.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image Available
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getStatusColor(item.status as ItemStatus)
              }`}>
                {item.status.toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
              <p className="text-gray-600">{item.category}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600">{item.mode} • {item.line} • {item.stationId}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Date Reported</h3>
              <p className="text-gray-600">
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Claim Button Section - NEW */}
          {item.type === 'found' && canClaim && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Found this item?</h3>
              <p className="text-green-800 mb-4">
                If you believe this is your lost item, you can submit a claim request.
              </p>
              <Link
                href={`/items/${item.id}/claim`}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                Claim This Item
              </Link>
            </div>
          )}

          {/* Status Messages for Claim Status */}
          {item.claimStatus !== 'unclaimed' && (
            <div className={`mt-6 p-4 rounded-lg ${item.claimStatus === 'verification-chat' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Claim Status</h3>
              <p className="text-gray-700">
                This item is currently **{item.claimStatus.toUpperCase().replace('-', ' ')}**. Check your dashboard for updates.
              </p>
            </div>
          )}

          {item.type === 'lost' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Lost Item Report</h3>
              <p className="text-blue-800">
                This item has been reported as lost. It is not currently available for general claim.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}