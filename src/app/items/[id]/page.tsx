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

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Item not found</div>;

  // FIX: Correctly check against valid ItemStatus values
  const canClaim = item.type === 'found' && item.claimStatus === 'unclaimed' && item.status === 'listed';

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="h-64 bg-gray-200 relative">
                {item.imageUrls?.[0] ? (
                    <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover" />
                ) : <div className="flex items-center justify-center h-full">No Image</div>}
            </div>
            <div className="p-6">
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold">{item.title}</h1>
                    <span className="bg-gray-100 px-3 py-1 rounded-full uppercase text-xs font-bold">{item.status.replace('_', ' ')}</span>
                </div>
                <p className="mt-4 text-gray-600">{item.description}</p>
                
                {/* Claim Action */}
                <div className="mt-8 border-t pt-6">
                    {canClaim ? (
                        <Link href={`/items/${item.id}/claim`} className="block w-full text-center bg-[#FF385C] text-white py-3 rounded-lg hover:bg-[#E31C5F]">
                            Claim This Item
                        </Link>
                    ) : (
                        <div className="bg-yellow-50 p-4 rounded text-yellow-800 text-center">
                            {item.type === 'lost' ? 'This is a lost item report.' : 'This item is currently being processed or claimed.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}