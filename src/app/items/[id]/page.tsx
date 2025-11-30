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

interface ItemDisplay extends Omit<Item, 'createdAt'> {
  createdAt: { toDate: () => Date } | Date | unknown;
}

export default function ItemDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<ItemDisplay | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'items', id))
        if (docSnap.exists()) {
          setItem({ id: docSnap.id, ...docSnap.data() } as ItemDisplay)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchItem()
  }, [id])

  const formatDate = (date: unknown) => {
      try {
          const jsDate = safeDateConvert(date);
          return format(jsDate, 'MMMM dd, yyyy');
      } catch {
          return 'Unknown Date';
      }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="animate-pulse h-64 bg-gray-200 rounded-lg"></div>
    </div>
  );
  
  if (!item) return <div className="max-w-4xl mx-auto p-8 text-center">Item not found</div>;

  // CRITICAL REQUIREMENT: Only 'found' items that are 'listed' and 'unclaimed' can be claimed.
  const canClaim = item.type === 'found' && item.claimStatus === 'unclaimed' && item.status === 'listed';

  return (
    <div className="max-w-4xl mx-auto p-6 my-8">
        <Link href="/browse" className="text-[#FF385C] hover:underline mb-4 inline-block">← Back to Browse</Link>
        
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
            <div className="h-80 bg-gray-100 relative">
                {item.imageUrls?.[0] ? (
                    <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                        <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>No Image Available</span>
                    </div>
                )}
                <div className="absolute top-4 right-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                        item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                        {item.type.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div className="p-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
                        <div className="flex items-center text-gray-500 text-sm">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {formatDate(item.createdAt)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</h3>
                        <p className="text-lg text-gray-900">{item.category}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Location Found/Lost</h3>
                        <p className="text-lg text-gray-900">{item.stationId} ({item.mode})</p>
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>
                </div>
                
                {/* Claim Action Area */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                    {canClaim ? (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-green-900">Is this your item?</h3>
                                <p className="text-green-700">You can submit a claim request for verification.</p>
                            </div>
                            <Link 
                                href={`/items/${item.id}/claim`} 
                                className="whitespace-nowrap bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                            >
                                Claim This Item
                            </Link>
                        </div>
                    ) : (
                        <div className={`p-4 rounded-lg text-center ${
                            item.type === 'lost' ? 'bg-blue-50 text-blue-800' : 'bg-yellow-50 text-yellow-800'
                        }`}>
                            <p className="font-medium">
                                {item.type === 'lost' 
                                    ? 'This is a user-reported lost item. If you found it, please hand it to station staff.' 
                                    : `This item is currently ${item.claimStatus.replace('-', ' ')} or not available for claim.`
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}