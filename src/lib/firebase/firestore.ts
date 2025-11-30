
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
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './config';
import { Item, ClaimRequest, Ticket, Message, CCTVClip, CCTVCamera, ItemStatus } from '@/types';

// Collection References
const itemsRef = collection(db, 'items');
const claimsRef = collection(db, 'claims');
const ticketsRef = collection(db, 'tickets');
const cctvRef = collection(db, 'cctv');
const camerasRef = collection(db, 'cameras');

export const FirestoreService = {
  // --- ITEMS ---
  
  getItems: async (filters?: { type?: 'lost' | 'found', status?: string }) => {
    let q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    if (filters?.type) {
      q = query(q, where('itemType', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
  },

  getItemById: async (id: string): Promise<Item | undefined> => {
    const docRef = doc(db, 'items', id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Item) : undefined;
  },

  createItem: async (item: Omit<Item, 'id'>) => {
    const docRef = await addDoc(itemsRef, {
      ...item,
      createdAt: Date.now(), // Using timestamp number for compatibility with existing types
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

  // --- TICKETS (Real-time) ---

  createTicket: async (ticket: Omit<Ticket, 'id' | 'messages'>) => {
    const docRef = await addDoc(ticketsRef, {
      ...ticket,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { id: docRef.id, ...ticket };
  },

  // Listener for a single ticket
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
    // In real Firestore, we might store messages as a subcollection, 
    // but here we follow the existing model of array for simplicity 
    // or we can append to the array.
    
    // Note: Array updates in Firestore should use arrayUnion, but we need the whole message object.
    // For this implementation, we'll fetch, append, and update.
    // OPTIMIZED: Subcollections are better, but sticking to type definition:
    
    const ticketDoc = await getDoc(docRef);
    if (ticketDoc.exists()) {
      const ticket = ticketDoc.data() as Ticket;
      const updatedMessages = [...ticket.messages, message];
      
      await updateDoc(docRef, {
        messages: updatedMessages,
        updatedAt: Date.now(),
        // Auto update status if needed
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
