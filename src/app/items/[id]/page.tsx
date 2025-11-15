'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams } from 'next/navigation'
import Image from 'next/image'
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

export default function ItemDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return format((date as { toDate: () => Date }).toDate(), 'MMMM dd, yyyy')
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
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
                item.status === 'open' ? 'bg-blue-100 text-blue-800' :
                item.status === 'claimed' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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

          {/* Claim Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Want to claim this item?</h4>
            <p className="text-blue-800 text-sm">
              To claim this item, please contact support or use the claim feature (to be implemented).
              Be prepared to provide proof of ownership.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}