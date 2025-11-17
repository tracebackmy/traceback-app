// src/components/AdminChatBox.tsx
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
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { ChatMessage, TypingIndicator, Ticket } from '@/types/chat';

export default function AdminChatBox() {
  const { admin } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(doc(db, 'typingIndicators', selectedTicket.id), {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 2000);
  };

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
        <div className="fixed bottom-20 right-6 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="bg-[#FF385C] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Admin Support Chat</h3>
              <p className="text-sm opacity-90">
                {selectedTicket ? `Chatting with ${selectedTicket.userName}` : 'Select a ticket'}
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
          {!selectedTicket && (
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="font-semibold text-gray-700 mb-4">Support Tickets</h4>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No active support tickets</p>
                ) : (
                  tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-[#FF385C] cursor-pointer transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{ticket.userName}</p>
                          <p className="text-xs text-gray-500">{ticket.userEmail}</p>
                          <p className="text-sm text-gray-700 mt-1">{ticket.subject}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ticket.status === 'open' 
                            ? 'bg-green-100 text-green-800' 
                            : ticket.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {selectedTicket && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-semibold">{selectedTicket.userName}</h4>
                    <p className="text-sm text-gray-500">{selectedTicket.userEmail}</p>
                  </div>
                  <button
                    onClick={() => closeTicket(selectedTicket.id)}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                  >
                    Close Ticket
                  </button>
                </div>

                <div className="space-y-3">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 ${
                          message.isAdmin
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
                          {formatTime(message.timestamp)}
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
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
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
        </div>
      )}
    </>
  );
}