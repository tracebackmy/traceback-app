
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Item, Ticket } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function ItemDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [item, setItem] = useState<Item | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [linkedTicket, setLinkedTicket] = useState<Ticket | undefined>(undefined);

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                const fetchedItem = await db.getItemById(id);
                setItem(fetchedItem);
                
                if (fetchedItem && user && fetchedItem.userId === user.uid) {
                    const tickets = await db.getTicketsByUser(user.uid);
                    const related = tickets.find(t => t.relatedItemId === fetchedItem.id);
                    setLinkedTicket(related);
                }
                
                setLoading(false);
            };
            fetchData();
        }
    }, [id, user]);

    const handleClaim = async () => {
        if(!user) {
            router.push('/login');
            return;
        }

        if(!user.isVerified) {
            alert("Security Requirement: You must verify your account on the Dashboard before you can submit claims.");
            router.push('/dashboard');
            return;
        }

        if(!item) return;

        setSubmitting(true);
        try {
            const claim = await db.createClaim({
                itemId: item.id,
                userId: user.uid,
                status: 'claim-submitted',
                evidence: []
            });
            
            await db.createTicket({
                userId: user.uid,
                type: 'claim_verification',
                title: `Claim for: ${item.title}`,
                description: `Automated ticket for claim verification. Item ID: ${item.id}`,
                relatedItemId: item.id,
                relatedClaimId: claim.id,
                status: 'open'
            });

            alert('Claim submitted! Check your dashboard for updates.');
            router.push('/dashboard');
        } catch(e) {
            console.error(e);
            alert('Error submitting claim');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUserResolve = async () => {
        if(!item || !user) return;
        if(confirm("Have you successfully found this item? This will mark the case as resolved and close the support ticket.")) {
            await db.resolveLostItem(item.id, user.uid);
            alert("Great news! Item marked as resolved.");
            router.push('/dashboard');
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading item details...</div>;
    if (!item) return <div className="p-8 text-center text-muted">Item not found.</div>;

    const isOwner = user && item.userId === user.uid;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow-soft overflow-hidden rounded-2xl border border-border">
                <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                        <h3 className="text-xl font-bold text-ink">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted">ID: {item.id}</p>
                    </div>
                    <span className={`self-start sm:self-center px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide border
                        ${item.status === 'resolved' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          item.itemType === 'found' ? 'bg-green-50 text-green-700 border-green-100' : 
                          'bg-red-50 text-red-700 border-red-100'}`}>
                        {item.status === 'resolved' ? 'RESOLVED' : item.itemType.toUpperCase()}
                    </span>
                </div>
                
                <div className="px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             {item.imageUrls.length > 0 ? (
                                <img src={item.imageUrls[0]} alt={item.title} className="w-full h-auto rounded-xl shadow-sm border border-border" />
                            ) : (
                                <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center rounded-xl border border-border text-gray-400 flex-col gap-2">
                                    <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-sm font-medium">No Image Available</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</h4>
                                <p className="text-base text-ink leading-relaxed">{item.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Category</h4>
                                    <p className="text-sm font-medium text-ink">{item.category}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Date {item.itemType === 'found' ? 'Found' : 'Lost'}</h4>
                                    <p className="text-sm font-medium text-ink">{new Date(item.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Location</h4>
                                    <p className="text-sm font-medium text-ink flex items-center gap-2">
                                        <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {item.stationId} <span className="text-gray-400">|</span> <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{item.mode}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {item.keywords.map((k, i) => (
                                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-100">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            {isOwner && item.itemType === 'lost' && item.status !== 'resolved' && (
                                <div className="pt-6 mt-4 border-t border-gray-100 space-y-3">
                                    <h4 className="text-sm font-bold text-ink mb-2">Status Actions</h4>
                                    {linkedTicket ? (
                                        <Link 
                                            href={`/tickets/${linkedTicket.id}`}
                                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-brand rounded-full text-sm font-bold text-brand bg-white hover:bg-brand/5 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                            Chat with Support
                                        </Link>
                                    ) : (
                                        <div className="text-sm text-muted">Ticket processing...</div>
                                    )}
                                    
                                    <button 
                                        onClick={handleUserResolve}
                                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-green-500 rounded-full text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        I Found My Item (Mark Resolved)
                                    </button>
                                </div>
                            )}

                            {!isOwner && item.itemType === 'found' && item.status === 'listed' && (
                                <div className="pt-6 mt-4 border-t border-gray-100">
                                    <button
                                        onClick={handleClaim}
                                        disabled={submitting}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-lg shadow-brand/20 text-sm font-bold text-white bg-brand hover:bg-brand-600 focus:outline-none transition transform active:scale-95 disabled:opacity-70"
                                    >
                                        {submitting ? 'Processing...' : 'This is mine - Claim Item'}
                                    </button>
                                    <p className="mt-3 text-xs text-muted text-center">
                                        You will be asked to provide proof of ownership in the verification chat.
                                    </p>
                                </div>
                            )}
                            
                            {item.status === 'resolved' && (
                                <div className="pt-6 mt-4 border-t border-gray-100">
                                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                                        <p className="text-sm font-bold text-gray-600">This item has been resolved and returned.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
