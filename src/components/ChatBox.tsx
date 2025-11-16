'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, orderBy, onSnapshot, where, Timestamp, doc, updateDoc } from 'firebase/firestore'
import Image from 'next/image'

interface Message {
  id: string
  text: string
  userId: string
  userName: string
  userEmail: string
  timestamp: unknown
  isAdmin: boolean
  ticketId?: string
}

interface Ticket {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  status: 'open' | 'closed'
  createdAt: unknown
  updatedAt: unknown
}

export default function ChatBox() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback((ticketId: string) => {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('ticketId', '==', ticketId),
      orderBy('timestamp', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[]
      
      setMessages(messagesData)
    })

    return unsubscribe
  }, [])

  const fetchTickets = useCallback(() => {
    if (!user) return

    try {
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      )
      
      const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ticket[]
        
        setTickets(ticketsData)
        
        // Set active ticket to the most recent open ticket, or create new one
        const openTicket = ticketsData.find(ticket => ticket.status === 'open')
        if (openTicket) {
          setActiveTicket(openTicket)
          fetchMessages(openTicket.id)
        }
      })

      return unsubscribe
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }, [user, fetchMessages])

  useEffect(() => {
    if (user && isOpen) {
      fetchTickets()
    }
  }, [user, isOpen, fetchTickets])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewTicket = async () => {
    if (!user) return

    try {
      setLoading(true)
      const ticketData = {
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User',
        userEmail: user.email || 'No email',
        subject: 'Lost Item Assistance',
        status: 'open' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'tickets'), ticketData)
      const newTicket: Ticket = { 
        id: docRef.id, 
        ...ticketData 
      }
      setActiveTicket(newTicket)
      setTickets(prev => [newTicket, ...prev])
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeTicket || !user) return

    try {
      const messageData = {
        text: newMessage.trim(),
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User',
        userEmail: user.email || 'No email',
        timestamp: Timestamp.now(),
        isAdmin: false,
        ticketId: activeTicket.id
      }

      await addDoc(collection(db, 'messages'), messageData)
      
      // Update ticket timestamp
      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        updatedAt: Timestamp.now()
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: unknown) => {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
      return new Date((timestamp as { toDate: () => Date }).toDate()).toLocaleTimeString()
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString()
    }
    return 'Unknown time'
  }

  if (!user) return null

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#FF385C] text-white w-14 h-14 rounded-full shadow-lg hover:bg-[#E31C5F] transition-all duration-200 flex items-center justify-center z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="bg-[#FF385C] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Support Chat</h3>
              <p className="text-sm opacity-90">
                {activeTicket ? 'Connected' : 'Start a conversation'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tickets List */}
          {!activeTicket && (
            <div className="p-4 flex-1">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Your Support Tickets</h4>
                {tickets.length === 0 ? (
                  <p className="text-sm text-gray-500">No active support tickets</p>
                ) : (
                  tickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => setActiveTicket(ticket)}
                      className={`w-full text-left p-3 rounded-lg border ${
                        ticket.status === 'open' 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-sm">{ticket.subject}</p>
                      <p className="text-xs text-gray-500">
                        {ticket.status === 'open' ? 'Open' : 'Closed'} • 
                        {ticket.updatedAt ? formatTimestamp(ticket.updatedAt) : 'Unknown date'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {activeTicket && (
            <>
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p>Start a conversation with our support team</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.userId === user.uid ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs rounded-lg px-3 py-2 ${
                            message.userId === user.uid
                              ? 'bg-[#FF385C] text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}

          {/* New Ticket Button */}
          {!activeTicket && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={createNewTicket}
                disabled={loading}
                className="w-full bg-[#FF385C] text-white py-2 px-4 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Start New Conversation'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}