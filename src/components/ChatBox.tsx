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
import { usePathname } from 'next/navigation'

export default function ChatBox() {
  const { user } = useAuth()
  const pathname = usePathname()
  
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

  // --- HOOKS MUST BE CALLED HERE (Before any return) ---

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

  // Fetch tickets
  useEffect(() => {
    // Guard clause inside the effect, not before it
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
      // Only set active ticket if one isn't selected or update current one
      if (!activeTicket) {
         const openTicket = ticketsData.find(ticket => ticket.status === 'open')
         if (openTicket) setActiveTicket(openTicket)
      }
    })
    return () => unsubscribe()
  }, [user, isOpen, activeTicket]) // Added activeTicket to deps to prevent overriding selection aggressively

  // Fetch messages
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
    })
    return () => unsubscribe()
  }, [activeTicket])

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isTyping, isOpen])

  // --- LOGIC FUNCTIONS ---

  const handleTyping = async () => {
    if (!user || !activeTicket) return;
    // We don't await here to avoid blocking UI
    updateDoc(doc(db, 'typingIndicators', activeTicket.id), {
      ticketId: activeTicket.id,
      userId: user.uid,
      userType: 'user',
      isTyping: true,
      timestamp: serverTimestamp()
    }).catch(console.error);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
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
      const newTicket: Ticket = { id: docRef.id, ...ticketData }
      setActiveTicket(newTicket)
      // setTickets is handled by the snapshot listener
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
      await updateDoc(doc(db, 'tickets', activeTicket.id), { updatedAt: Timestamp.now() });
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
      e.target.value = '';
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeTicket || !user) return
    try {
      const messageText = newMessage.trim();
      setNewMessage(''); // Clear UI immediately
      
      const messageData = {
        text: messageText,
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
      await updateDoc(doc(db, 'tickets', activeTicket.id), { updatedAt: Timestamp.now() })
      await updateDoc(doc(db, 'typingIndicators', activeTicket.id), { isTyping: false, timestamp: serverTimestamp() });
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(newMessage); // Revert on error
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: any) => {
     if (!timestamp?.toDate) return '';
     return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // --- CONDITIONAL RENDERING (Must be last) ---

  // Check visibility logic
  const hiddenPaths = ['/', '/auth/login', '/auth/register'];
  const isHidden = hiddenPaths.includes(pathname) || !user;

  if (isHidden) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#FF385C] text-white w-14 h-14 rounded-full shadow-lg hover:bg-[#E31C5F] transition-all duration-200 flex items-center justify-center z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          <div className="bg-[#FF385C] text-white p-4 flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-semibold">Support Chat</h3>
              <p className="text-xs opacity-90">{activeTicket ? 'Connected' : 'Start a conversation'}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80">
              ✕
            </button>
          </div>

          {!activeTicket && (
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="font-semibold text-gray-700 mb-3">Your Conversations</h4>
              {tickets.length === 0 ? (
                <div className="text-center text-gray-500 py-6 text-sm">No previous chats found.</div>
              ) : (
                tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className="w-full text-left p-3 mb-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-sm text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">{ticket.status.toUpperCase()} • {formatTimestamp(ticket.updatedAt)}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTicket && (
            <>
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                <div className="mb-2 flex justify-between items-center">
                    <button 
                        onClick={() => setActiveTicket(null)}
                        className="text-xs text-gray-500 hover:text-gray-900 flex items-center"
                    >
                        ← Back
                    </button>
                </div>
                {messages.map(message => (
                  <div key={message.id} className={`flex mb-3 ${message.userId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.userId === user.uid ? 'bg-[#FF385C] text-white' : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}>
                      {message.type === 'text' && <p>{message.text}</p>}
                      {message.type === 'image' && <img src={message.fileUrl} className="rounded max-h-32" alt="attachment" />}
                      <p className={`text-[10px] mt-1 text-right ${message.userId === user.uid ? 'text-white/80' : 'text-gray-400'}`}>
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                   <div className="flex justify-start mb-3">
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                         <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                         </div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 py-2 px-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:bg-white transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-[#FF385C] text-white rounded-full hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {!activeTicket && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
               <button
                 onClick={createNewTicket}
                 disabled={loading}
                 className="w-full bg-[#FF385C] text-white py-2.5 rounded-lg hover:bg-[#E31C5F] text-sm font-medium shadow-sm transition-all"
               >
                 + Start New Chat
               </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}