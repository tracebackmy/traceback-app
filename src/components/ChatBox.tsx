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
      if (!activeTicket) {
         const openTicket = ticketsData.find(ticket => ticket.status === 'open')
         if (openTicket) setActiveTicket(openTicket)
      }
    })
    return () => unsubscribe()
  }, [user, isOpen, activeTicket])

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

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isTyping, isOpen])

  const handleTyping = async () => {
    if (!user || !activeTicket) return;
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
      setNewMessage(''); 
      
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
      setNewMessage(newMessage);
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

  const hiddenPaths = ['/', '/auth/login', '/auth/register'];
  const isHidden = hiddenPaths.includes(pathname) || !user;

  if (isHidden) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#FF385C] text-white w-14 h-14 rounded-full shadow-xl hover:bg-[#E31C5F] transition-all duration-200 flex items-center justify-center z-50 transform hover:scale-105 active:scale-95"
        title="Open Support Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#FF385C] text-white p-4 flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-bold text-lg">Support Chat</h3>
              <p className="text-xs opacity-90">{activeTicket ? 'Connected with Admin' : 'How can we help?'}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {!activeTicket && (
            <div className="p-5 flex-1 overflow-y-auto flex flex-col">
              <h4 className="font-semibold text-gray-800 mb-4">Recent Conversations</h4>
              {tickets.length === 0 ? (
                <div className="text-center text-gray-500 py-12 flex-1 flex flex-col justify-center items-center">
                   <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <p className="text-sm">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => setActiveTicket(ticket)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                         <p className="font-semibold text-sm text-gray-900 line-clamp-1">{ticket.subject}</p>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                           ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                         }`}>
                           {ticket.status.toUpperCase()}
                         </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatTimestamp(ticket.updatedAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTicket && (
            <>
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
                <div className="mb-4">
                   <button onClick={() => setActiveTicket(null)} className="text-xs text-gray-500 hover:text-gray-900 flex items-center font-medium">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back to tickets
                   </button>
                </div>
                
                {messages.map(message => (
                  <div key={message.id} className={`flex mb-3 ${message.userId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
                      message.userId === user.uid 
                        ? 'bg-[#FF385C] text-white rounded-br-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }`}>
                      {message.type === 'text' && <p>{message.text}</p>}
                      {message.type === 'image' && <img src={message.fileUrl} className="rounded-lg max-h-40 object-cover" alt="attachment" />}
                      <p className={`text-[10px] mt-1.5 text-right ${message.userId === user.uid ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                   <div className="flex justify-start mb-3">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
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

              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-[#FF385C] focus-within:border-transparent transition-all">
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
                    className="p-2 text-gray-500 hover:text-[#FF385C] hover:bg-white rounded-full transition-colors"
                    title="Attach Image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={`p-2 rounded-full text-white transition-all shadow-sm ${
                        !newMessage.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#FF385C] hover:bg-[#E31C5F]'
                    }`}
                  >
                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {!activeTicket && (
            <div className="p-5 border-t border-gray-100 bg-gray-50">
               <button
                 onClick={createNewTicket}
                 disabled={loading}
                 className="w-full bg-white text-[#FF385C] py-3 rounded-xl border border-[#FF385C] hover:bg-pink-50 text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 Start New Conversation
               </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}