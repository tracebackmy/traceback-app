// ... existing imports
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  startAfter, 
  limit
} from 'firebase/firestore';
import { db } from './config';
import { Item, ClaimRequest, Ticket, Message, CCTVClip, CCTVCamera } from '@/types';

// ... refs remain the same

export const FirestoreService = {
  // --- ITEMS ---
  
  getItems: async (filters?: { 
    type?: 'lost' | 'found', 
    status?: string, 
    userId?: string, 
    search?: string,
    category?: string, // <--- ADDED THIS
    lastId?: string,
    limit?: number 
  }) => {
    const pageSize = filters?.limit || 12;
    let q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters?.type) {
      q = query(q, where('itemType', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.category) { // <--- ADDED LOGIC
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.search) {
      q = query(q, where('keywords', 'array-contains', filters.search.toLowerCase()));
    }

    if (filters?.lastId) {
      const lastDocRef = doc(db, 'items', filters.lastId);
      const lastDocSnap = await getDoc(lastDocRef);
      if (lastDocSnap.exists()) {
        q = query(q, startAfter(lastDocSnap));
      }
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    const lastVisible = items.length > 0 ? items[items.length - 1].id : null;

    return { items, lastId: lastVisible };
  },

  // ... keep the rest of the file exactly as it was in Phase 3
  getItemById: async (id: string): Promise<Item | undefined> => {
    const docRef = doc(db, 'items', id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Item) : undefined;
  },
  
  createItem: async (item: Omit<Item, 'id'>) => {
    const docRef = await addDoc(itemsRef, {
      ...item,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: docRef.id, ...item };
  },

  updateItemStatus: async (id: string, status: Item['status']) => {
    const docRef = doc(db, 'items', id);
    await updateDoc(docRef, { 
      status, 
      updatedAt: Date.now() 
    });
  },

  // --- CLAIMS ---
  getClaimsByUser: async (userId: string) => {
    const q = query(claimsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClaimRequest));
  },

  getAllClaims: async () => {
    const q = query(claimsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClaimRequest));
  },

  createClaim: async (claim: Omit<ClaimRequest, 'id'>) => {
    const docRef = await addDoc(claimsRef, {
      ...claim,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: docRef.id, ...claim };
  },

  updateClaimStatus: async (id: string, status: ClaimRequest['status'], reason?: string) => {
    const docRef = doc(db, 'claims', id);
    await updateDoc(docRef, { 
      status, 
      rejectionReason: reason || null,
      updatedAt: Date.now() 
    });
  },

  // --- TICKETS ---
  createTicket: async (ticket: Omit<Ticket, 'id' | 'messages'>) => {
    const docRef = await addDoc(ticketsRef, {
      ...ticket,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: docRef.id, ...ticket };
  },

  subscribeToTicket: (ticketId: string, callback: (ticket: Ticket) => void) => {
    const docRef = doc(db, 'tickets', ticketId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Ticket);
      }
    });
  },

  addMessage: async (ticketId: string, message: Message) => {
    const docRef = doc(db, 'tickets', ticketId);
    const ticketDoc = await getDoc(docRef);
    if (ticketDoc.exists()) {
      const ticket = ticketDoc.data() as Ticket;
      const updatedMessages = [...ticket.messages, message];
      await updateDoc(docRef, {
        messages: updatedMessages,
        updatedAt: Date.now(),
      });
    }
  },

  // --- CCTV ---
  getCCTVClips: async () => {
    const q = query(cctvRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CCTVClip));
  },

  createCCTVClip: async (clip: Omit<CCTVClip, 'id'>) => {
    const docRef = await addDoc(cctvRef, clip);
    return { id: docRef.id, ...clip };
  },

  deleteCCTVClip: async (id: string) => {
    await deleteDoc(doc(db, 'cctv', id));
  }
};