'use client';

import { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { ChatMessage, TypingIndicator, Ticket } from '@/types/chat';
import Link from 'next/link';

// Helper interface for context data
interface ContextDetails {
  title?: string;
  subtitle?: string;
  status?: string;
  imageUrl?: string;
  linkUrl?: string;
  type: 'item' | 'claim' | 'none';
}

export default function AdminChatBox() {
  const { admin } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [contextDetails, setContextDetails] = useState<ContextDetails | null>(null); // New State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Real-time typing indicators
  useEffect(() => {
    if (!selectedTicket?.id) return;

    const typingRef = doc(db, 'typingIndicators', selectedTicket.id);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      const data = doc.data() as TypingIndicator;
      if (data && data.userType === 'user' && data.isTyping) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  // Fetch tickets when chat opens
  useEffect(() => {
    if (!isOpen) return;

    const ticketsQuery = query(
      collection(db, 'tickets'),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // NEW: Fetch Context Data (Item or Claim)
  useEffect(() => {
    if (!selectedTicket) {
      setContextDetails(null);
      return;
    }

    const fetchContext = async () => {
      // Default fallback
      let details: ContextDetails = { type: 'none' };

      if (selectedTicket.contextType === 'lost_report' && selectedTicket.relatedId) {
        try {
          const itemDoc = await getDoc(doc(db, 'items', selectedTicket.relatedId));
          if (itemDoc.exists()) {
            const data = itemDoc.data();
            details = {
              type: 'item',
              title: data.title,
              subtitle: `Lost at ${data.stationId}`,
              status: data.status,
              imageUrl: data.imageUrls?.[0],
              linkUrl: `/traceback-admin/items/${itemDoc.id}`
            };
          }
        } catch (e) { console.error(e); }
      } else if (selectedTicket.contextType === 'claim_inquiry' && selectedTicket.relatedId) {
        try {
          const claimDoc = await getDoc(doc(db, 'claims', selectedTicket.relatedId));
          if (claimDoc.exists()) {
            const data = claimDoc.data();
            details = {
              type: 'claim',
              title: `Claim for Item #${data.itemId.substring(0,6)}`, // Or fetch item title if needed
              subtitle: `Reason: ${data.claimReason.substring(0, 20)}...`,
              status: data.status,
              linkUrl: `/traceback-admin/claims/${claimDoc.id}`
            };
          }
        } catch (e) { console.error(e); }
      }

      setContextDetails(details);
    };

    fetchContext();
  }, [selectedTicket]);

  // Fetch messages when ticket is selected
  useEffect(() => {
    if (!selectedTicket) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('ticketId', '==', selectedTicket.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      setMessages(messagesData);
      
      // Mark user messages as read
      messagesData.forEach(async (message) => {
        if (!message.isAdmin && !message.read) {
          await updateDoc(doc(db, 'messages', message.id), {
            read: true
          });
        }
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  const handleTyping = async () => {
    if (!admin || !selectedTicket) return;

    await updateDoc(doc(db, 'typingIndicators', selectedTicket.id), {
      ticketId: selectedTicket.id,
      userId: admin.uid,
      userType: 'admin',
      isTyping: true,
      timestamp: serverTimestamp()
    });

    if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null; // Add this for cleanup
    }

    typingTimeoutRef.current = setTimeout(async () => {
    await updateDoc(doc(db, 'typingIndicators', selectedTicket.id), {
        isTyping: false,
        timestamp: serverTimestamp()
    });
    }, 2000);
  }

  const handleFileUpload = async (file: File) => {
    if (!admin || !selectedTicket) return;

    setUploading(true);
    try {
      const fileRef = ref(storage, `chat-files/${selectedTicket.id}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const messageData = {
        text: '',
        userId: admin.uid,
        userName: 'Admin',
        userEmail: admin.email,
        timestamp: Timestamp.now(),
        isAdmin: true,
        ticketId: selectedTicket.id,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        fileUrl: downloadURL,
        fileName: file.name,
        read: false
      }

      await addDoc(collection(db, 'messages'), messageData);
      
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
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
      e.target.value = '';
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !admin) return;

    try {
      const messageData = {
        text: newMessage.trim(),
        userId: admin.uid,
        userName: 'Admin',
        userEmail: admin.email,
        timestamp: Timestamp.now(),
        isAdmin: true,
        ticketId: selectedTicket.id,
        type: 'text' as const,
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        updatedAt: Timestamp.now(),
        status: 'in-progress'
      });

      // Clear typing indicator
      await updateDoc(doc(db, 'typingIndicators', selectedTicket.id), {
        isTyping: false,
        timestamp: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: 'closed',
        updatedAt: Timestamp.now()
      });
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setMessages([]);
        setContextDetails(null);
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
  };

  const formatTime = (timestamp: unknown) => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        date = (timestamp as { toDate: () => Date }).toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp as string);
      }
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#FF385C] text-white w-14 h-14 rounded-full shadow-xl hover:bg-[#E31C5F] transition-all duration-200 flex items-center justify-center z-50 transform hover:scale-105 active:scale-95"
        title="Admin Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#FF385C] text-white p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="font-bold text-lg">Admin Console</h3>
              <p className="text-xs opacity-90">
                {selectedTicket ? `Chatting with ${selectedTicket.userName}` : 'Inbox'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {!selectedTicket && (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-4">Incoming Support Tickets</h4>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No active support tickets</p>
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-[#FF385C] cursor-pointer transition-all"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900">{ticket.userName}</p>
                            {/* Context Badge */}
                            {ticket.contextType && ticket.contextType !== 'general' && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded uppercase font-bold">
                                {ticket.contextType === 'claim_inquiry' ? 'Claim' : 'Lost Item'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{ticket.userEmail}</p>
                          <p className="text-sm text-gray-700 mt-2 line-clamp-1">{ticket.subject}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ticket.status === 'open' 
                            ? 'bg-green-100 text-green-700' 
                            : ticket.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] text-gray-400 text-right">
                        Last updated: {formatTime(ticket.updatedAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedTicket && (
            <>
              {/* Context Panel - Displays Item or Claim Details */}
              {contextDetails && contextDetails.type !== 'none' && (
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-start gap-3">
                  {contextDetails.imageUrl && (
                    <img src={contextDetails.imageUrl} alt="Context" className="w-12 h-12 rounded object-cover border border-blue-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900 truncate">{contextDetails.title}</p>
                    <p className="text-xs text-blue-700 truncate">{contextDetails.subtitle}</p>
                    <div className="flex items-center mt-1 gap-2">
                      <span className="text-[10px] bg-white text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 uppercase font-semibold">
                        {contextDetails.status}
                      </span>
                      {contextDetails.linkUrl && (
                        <Link href={contextDetails.linkUrl} className="text-[10px] text-blue-600 underline hover:text-blue-800">
                          View Full Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                <div className="mb-4 flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-sm">{selectedTicket.userName}</h4>
                    <p className="text-xs text-gray-500">{selectedTicket.userEmail}</p>
                  </div>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => setSelectedTicket(null)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => closeTicket(selectedTicket.id)}
                        className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
                    >
                        Close
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          message.isAdmin
                            ? 'bg-[#FF385C] text-white rounded-br-none'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}
                      >
                        {message.type === 'image' ? (
                          <img
                            src={message.fileUrl}
                            alt="Shared image"
                            className="max-w-full h-auto rounded-lg mb-1"
                          />
                        ) : message.type === 'file' ? (
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center hover:underline mb-1 ${message.isAdmin ? 'text-white' : 'text-blue-600'}`}
                          >
                            📎 {message.fileName}
                          </a>
                        ) : (
                          <p>{message.text}</p>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${message.isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-400 p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm">
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
              </div>

              <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex items-center gap-2">
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
                    className="p-2 text-gray-400 hover:text-[#FF385C] hover:bg-gray-50 rounded-full transition-colors"
                  >
                    {uploading ? '...' : '📎'}
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your reply..."
                    className="flex-1 bg-gray-100 text-sm px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:bg-white transition-all"
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
        </div>
      )}
    </>
  );
}