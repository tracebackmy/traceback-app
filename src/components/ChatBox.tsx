// src/components/ChatBox.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { db, storage } from '@/lib/firebase'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  Timestamp, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ChatMessage, TypingIndicator, Ticket } from '@/types/chat'

export default function ChatBox() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Real-time typing indicators
  useEffect(() => {
    if (!activeTicket?.id) return;

    const typingRef = doc(db, 'typingIndicators', activeTicket.id);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      const data = doc.data() as TypingIndicator;
      if (data && data.userType === 'admin' && data.isTyping) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => unsubscribe();
  }, [activeTicket?.id]);

  // Fetch tickets when chat opens and user is logged in
  useEffect(() => {
    if (!user || !isOpen) return;

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
      
      // Set active ticket to the most recent open ticket
      const openTicket = ticketsData.find(ticket => ticket.status === 'open')
      if (openTicket) {
        setActiveTicket(openTicket)
      }
    })

    return () => unsubscribe()
  }, [user, isOpen])

  // Fetch messages when active ticket changes
  useEffect(() => {
    if (!activeTicket) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('ticketId', '==', activeTicket.id),
      orderBy('timestamp', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[]
      
      setMessages(messagesData)
      
      // Mark messages as read
      messagesData.forEach(async (message) => {
        if (message.isAdmin && !message.read) {
          await updateDoc(doc(db, 'messages', message.id), {
            read: true
          });
        }
      });
    })

    return () => unsubscribe()
  }, [activeTicket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleTyping = async () => {
    if (!user || !activeTicket) return;

    await updateDoc(doc(db, 'typingIndicators', activeTicket.id), {
      ticketId: activeTicket.id,
      userId: user.uid,
      userType: 'user',
      isTyping: true,
      timestamp: serverTimestamp()
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null; // Add this for cleanup
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(doc(db, 'typingIndicators', activeTicket.id), {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 2000);
    }
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
        priority: 'medium' as const,
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

  const handleFileUpload = async (file: File) => {
    if (!user || !activeTicket) return;

    setUploading(true);
    try {
      const fileRef = ref(storage, `chat-files/${activeTicket.id}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const messageData = {
        text: '',
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User',
        userEmail: user.email || 'No email',
        timestamp: Timestamp.now(),
        isAdmin: false,
        ticketId: activeTicket.id,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        fileUrl: downloadURL,
        fileName: file.name,
        read: false
      }

      await addDoc(collection(db, 'messages'), messageData);
      
      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = ''; // Reset input
    }
  };

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
        ticketId: activeTicket.id,
        type: 'text' as const,
        read: false
      }

      await addDoc(collection(db, 'messages'), messageData)
      
      // Update ticket timestamp
      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        updatedAt: Timestamp.now()
      })

      // Clear typing indicator
      await updateDoc(doc(db, 'typingIndicators', activeTicket.id), {
        isTyping: false,
        timestamp: serverTimestamp()
      });

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
    if (!timestamp) return 'Unknown time';
    
    try {
      let date: Date;
      
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        date = (timestamp as { toDate: () => Date }).toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp as string);
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
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
                          {message.type === 'image' ? (
                            <img
                              src={message.fileUrl}
                              alt="Shared image"
                              className="max-w-full h-auto rounded mb-1"
                            />
                          ) : message.type === 'file' ? (
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:underline mb-1"
                            >
                              📎 {message.fileName}
                            </a>
                          ) : (
                            <p className="text-sm">{message.text}</p>
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? '📤' : '📎'}
                  </button>
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 transition-colors"
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
                className="w-full bg-[#FF385C] text-white py-2 px-4 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 transition-colors"
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