'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, onSnapshot, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Ticket {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  status: 'open' | 'closed'
  itemId?: string
  createdAt: unknown
  updatedAt: unknown
}

interface Item {
  id: string
  title: string
  type: 'lost' | 'found'
  status: string
  userName: string
  createdAt: unknown
}

export default function TracebackAdmin() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'items'>('tickets')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(() => {
    const ticketsQuery = query(
      collection(db, 'tickets'),
      orderBy('updatedAt', 'desc')
    )
    
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[]
      
      setTickets(ticketsData)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const fetchItems = useCallback(() => {
    const itemsQuery = query(
      collection(db, 'items'),
      orderBy('createdAt', 'desc')
    )
    
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[]
      
      setItems(itemsData)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribeTickets = fetchTickets()
    const unsubscribeItems = fetchItems()

    return () => {
      unsubscribeTickets()
      unsubscribeItems()
    }
  }, [fetchTickets, fetchItems])

  const updateTicketStatus = async (ticketId: string, status: 'open' | 'closed') => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating ticket:', error)
    }
  }

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return new Date((date as { toDate: () => Date }).toDate()).toLocaleDateString()
    }
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }
    return 'Unknown date'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Traceback Admin</h1>
        <p className="text-gray-600 mt-2">Manage support tickets and reported items</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tickets'
                ? 'border-[#FF385C] text-[#FF385C]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-[#FF385C] text-[#FF385C]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reported Items ({items.length})
          </button>
        </nav>
      </div>

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {tickets.map(ticket => (
              <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      From: {ticket.userName} ({ticket.userEmail})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.status}
                    </span>
                    
                    {ticket.status === 'open' ? (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, 'closed')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, 'open')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {tickets.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No support tickets found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Reported Items</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {items.map(item => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`text-sm px-2 py-1 rounded ${
                        item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-sm text-gray-600">By: {item.userName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <select
                      value={item.status}
                      onChange={(e) => updateItemStatus(item.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="claimed">Claimed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No reported items found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}