'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/services/mockFirebase';
import { Ticket } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';

export default function TicketChatPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'admin';

    // Real-time Subscription
    useEffect(() => {
        if (!id) return;

        // The callback runs immediately with current data, then on every change
        const unsubscribe = db.subscribeToTicket(id, (updatedTicket) => {
            setTicket(updatedTicket);
            setLoading(false);
        });

        // Cleanup listener on unmount
        return () => {
            unsubscribe();
        };
    }, [id]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages, attachment]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { 
                alert('File size too large. Max 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || !user || !ticket) return;

        const msgContent = newMessage;
        const msgAttachment = attachment;
        
        // Clear input immediately for better UX
        setNewMessage(''); 
        setAttachment(null); 
        
        // Auto-update status if admin replies to an open ticket
        if (isAdmin && ticket.status === 'open') {
             await db.updateTicketStatus(ticket.id, 'in-progress');
        }

        await db.addMessage(ticket.id, {
            senderId: user.uid,
            senderName: user.displayName || (isAdmin ? 'Admin Support' : 'User'),
            content: msgContent,
            attachmentUrl: msgAttachment || undefined,
            read: false,
            isAdmin: isAdmin
        });
    };

    const handleResolve = async () => {
        if (!ticket) return;
        if (window.confirm("Are you sure you want to mark this ticket as resolved? This will close the chat.")) {
            await db.updateTicketStatus(ticket.id, 'resolved');
        }
    };
    
    const handleApproveClaim = async () => {
        if(!ticket || !ticket.relatedClaimId || !user) return;
        if(confirm("Confirm Claim Approval? This will mark the item as resolved/found and notify the user to collect it.")) {
            await db.approveClaim(ticket.relatedClaimId, user.uid);
            alert("Claim approved and item marked as resolved.");
            router.push('/admin/claims');
        }
    };

    const renderMessageContent = (content: string) => {
        // Parse special system tags for CCTV
        const cctvRegex = /\[\[CCTV:(.*?)\]\]/;
        const match = content.match(cctvRegex);

        if (match) {
            const [fullMatch, clipId] = match;
            const textParts = content.split(fullMatch);
            
            return (
                <div>
                    {textParts[0]}
                    <div className="my-2 p-3 bg-gray-900 rounded-lg shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 font-mono">EVIDENCE_CLIP_{clipId.substring(0,6)}</span>
                            <span className="text-[10px] bg-red-600 text-white px-1.5 rounded">RESTRICTED</span>
                        </div>
                        <button 
                            onClick={() => alert(`Secure Video Player\n\nLoading clip ID: ${clipId}...`)}
                            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-2 rounded font-bold text-sm hover:bg-white/20 transition border border-white/10"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Play Evidence Footage
                        </button>
                    </div>
                    {textParts[1]}
                </div>
            );
        }
        return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>;
    };

    if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div><p className="mt-4 text-muted">Connecting to secure chat...</p></div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] flex flex-col">
            <div className="bg-white shadow-soft sm:rounded-2xl border border-border flex-grow flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-white flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-brand transition">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg leading-6 font-bold text-ink">{ticket.title}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    ticket.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' :
                                    ticket.status === 'in-progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                    {ticket.status}
                                </span>
                            </div>
                            <p className="text-sm text-muted">Ticket #{ticket.id} • {ticket.type.replace('_', ' ')}</p>
                        </div>
                    </div>
                    
                    {isAdmin && ticket.status !== 'resolved' && (
                        <button 
                            onClick={handleResolve}
                            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 transition"
                        >
                            Mark Resolved
                        </button>
                    )}
                </div>

                {/* Admin Action Bar for Claims */}
                {isAdmin && ticket.type === 'claim_verification' && ticket.status !== 'resolved' && (
                    <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-2 items-center text-sm text-blue-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="font-semibold">Claim Verification in progress.</span>
                        </div>
                        <button 
                            onClick={handleApproveClaim}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow hover:bg-blue-700 transition"
                        >
                            Approve Claim & Item
                        </button>
                    </div>
                )}

                {/* Context Header */}
                {ticket.description && (
                     <div className="px-6 py-2 bg-gray-50 text-xs text-muted border-b border-gray-100 truncate">
                        Context: {ticket.description}
                     </div>
                )}

                {/* Messages Area */}
                <div className="flex-grow p-6 overflow-y-auto bg-gray-50 space-y-6">
                    {ticket.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                            <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <p className="text-sm text-gray-500">Start the conversation with {isAdmin ? 'the user' : 'support'}.</p>
                        </div>
                    ) : (
                        ticket.messages.map((msg) => {
                            const isMe = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl shadow-sm overflow-hidden ${
                                        isMe 
                                          ? 'bg-brand text-white rounded-br-none' 
                                          : 'bg-white text-ink border border-gray-100 rounded-bl-none'
                                    }`}>
                                        <div className={`px-5 py-3`}>
                                            <div className={`text-xs mb-1 font-bold ${isMe ? 'text-white/80' : 'text-brand'}`}>
                                                {msg.senderName}
                                            </div>
                                            
                                            {msg.attachmentUrl && (
                                                <div className="mb-2">
                                                    <img 
                                                        src={msg.attachmentUrl} 
                                                        alt="attachment" 
                                                        className="max-h-60 rounded-lg object-cover bg-black/5"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}

                                            {msg.content && renderMessageContent(msg.content)}
                                            
                                            <div className={`text-[10px] mt-2 text-right ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-6 py-5 bg-white border-t border-border">
                    {ticket.status === 'resolved' ? (
                        <div className="text-center py-3 bg-gray-100 rounded-xl text-muted text-sm font-medium border border-gray-200">
                            This ticket has been resolved. Chat is closed.
                        </div>
                    ) : (
                        <div>
                            {attachment && (
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="relative group">
                                        <img src={attachment} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm" />
                                        <button 
                                            onClick={() => setAttachment(null)}
                                            className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <span className="text-xs text-muted font-medium">Image attached</span>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex gap-3 items-end">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden" 
                                />
                                
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-brand transition focus:outline-none focus:ring-2 focus:ring-brand/20"
                                    title="Attach Image"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </button>

                                <div className="flex-grow relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand block w-full text-sm border rounded-xl px-4 py-3 transition outline-none text-gray-900 font-medium"
                                        placeholder={isAdmin ? "Type a reply to the user..." : "Type your message..."}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() && !attachment}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-lg shadow-brand/20 text-white bg-brand hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition disabled:opacity-50 disabled:shadow-none h-[46px]"
                                >
                                    <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    <span className="hidden md:inline">Send</span>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}