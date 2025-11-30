
import { 
  SystemUser, 
  Item, 
  ClaimRequest, 
  Ticket, 
  Message, 
  DashboardStats, 
  CCTVClip, 
  CCTVCamera,
  ItemStatus
} from '../types';

const STORAGE_KEYS = {
  USERS: 'traceback_users',
  ITEMS: 'traceback_items',
  CLAIMS: 'traceback_claims',
  TICKETS: 'traceback_tickets',
  CCTV: 'traceback_cctv',
  CAMERAS: 'traceback_cameras',
  CURRENT_USER: 'traceback_current_user'
};

// Seed Data
const seedItems: Item[] = [
  {
    id: 'item_1',
    userId: 'admin_1',
    itemType: 'found',
    title: 'Blue Sony Headphones',
    description: 'Found on the bench near platform 2. Noise cancelling model WH-1000XM4.',
    category: 'Electronics',
    stationId: 'KL Sentral',
    mode: 'MRT',
    line: 'Kajang Line',
    keywords: ['headphones', 'sony', 'blue', 'electronics'],
    status: 'listed',
    imageUrls: ['https://picsum.photos/id/1/400/300'],
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now()
  },
  {
    id: 'item_2',
    userId: 'user_2',
    itemType: 'lost',
    title: 'Red Leather Wallet',
    description: 'Lost my red prada wallet containing ID and credit cards.',
    category: 'Personal Accessories',
    stationId: 'Pasar Seni',
    mode: 'LRT',
    line: 'Kelana Jaya Line',
    keywords: ['wallet', 'red', 'leather', 'cards'],
    status: 'reported',
    imageUrls: [],
    createdAt: Date.now() - 5000000,
    updatedAt: Date.now()
  }
];

const seedCCTV: CCTVClip[] = [
  {
    id: 'cctv_1',
    stationId: 'KL Sentral',
    cameraLocation: 'Platform 1 - North Entrance',
    timestamp: Date.now() - 86400000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=400&auto=format&fit=crop',
    duration: '00:45',
    notes: 'Passenger dropped a blue bag near bench'
  },
  {
    id: 'cctv_2',
    stationId: 'Pasar Seni',
    cameraLocation: 'Escalator B - Level 2',
    timestamp: Date.now() - 172800000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1599256621730-535171e28e50?q=80&w=400&auto=format&fit=crop',
    duration: '02:10',
    notes: 'Crowd movement during peak hour'
  }
];

const seedCameras: CCTVCamera[] = [
    {
        id: 'cam_1',
        stationId: 'KL Sentral',
        location: 'Main Concourse',
        streamUrl: 'https://media.istockphoto.com/id/1189917812/video/time-lapse-of-unidentified-people-walking-at-kuala-lumpur-public-transportation-hub-kl.mp4?s=mp4-640x640-is&k=20&c=6n3w8J5zC5x-8x-9x-0x-1x-2x',
        status: 'online'
    },
    {
        id: 'cam_2',
        stationId: 'Bukit Bintang',
        location: 'Gate A Entrance',
        streamUrl: '',
        status: 'maintenance'
    }
];

class MockFirebaseService {
  private users: SystemUser[] = [];
  private items: Item[] = [];
  private claims: ClaimRequest[] = [];
  private tickets: Ticket[] = [];
  private cctvClips: CCTVClip[] = [];
  private cameras: CCTVCamera[] = [];

  // Subscriptions
  private ticketListeners: Map<string, Function[]> = new Map();
  private statsListeners: Function[] = [];
  private userItemsListeners: Map<string, Function[]> = new Map();
  private userClaimsListeners: Map<string, Function[]> = new Map();
  private userTicketsListeners: Map<string, Function[]> = new Map();
  private notificationListeners: Map<string, Function[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
        this.loadFromStorage();
        if (this.items.length === 0) {
            this.items = seedItems;
            this.saveToStorage();
        }
        if (this.cctvClips.length === 0) {
            this.cctvClips = seedCCTV;
            this.saveToStorage();
        }
        if (this.cameras.length === 0) {
            this.cameras = seedCameras;
            this.saveToStorage();
        }
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    const ls = localStorage;
    this.users = JSON.parse(ls.getItem(STORAGE_KEYS.USERS) || '[]');
    this.items = JSON.parse(ls.getItem(STORAGE_KEYS.ITEMS) || '[]');
    this.claims = JSON.parse(ls.getItem(STORAGE_KEYS.CLAIMS) || '[]');
    this.tickets = JSON.parse(ls.getItem(STORAGE_KEYS.TICKETS) || '[]');
    this.cctvClips = JSON.parse(ls.getItem(STORAGE_KEYS.CCTV) || '[]');
    this.cameras = JSON.parse(ls.getItem(STORAGE_KEYS.CAMERAS) || '[]');
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    const ls = localStorage;
    ls.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    ls.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(this.items));
    ls.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(this.claims));
    ls.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(this.tickets));
    ls.setItem(STORAGE_KEYS.CCTV, JSON.stringify(this.cctvClips));
    ls.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(this.cameras));
    
    // Trigger generic updates
    this.notifyStatsListeners();
  }

  // --- NOTIFICATION & OBSERVER SYSTEM ---
  private notifyTicketListeners(ticketId: string) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket && this.ticketListeners.has(ticketId)) {
      this.ticketListeners.get(ticketId)?.forEach(cb => cb(ticket));
    }
    // Also update user lists
    if (ticket) this.notifyUserTicketsListeners(ticket.userId);
  }

  private notifyStatsListeners() {
      const stats = this.getDashboardStats();
      this.statsListeners.forEach(cb => cb(stats));
  }

  private notifyUserItemsListeners(userId: string) {
      if (this.userItemsListeners.has(userId)) {
          const items = this.items.filter(i => i.userId === userId);
          this.userItemsListeners.get(userId)?.forEach(cb => cb(items));
      }
  }

  private notifyUserClaimsListeners(userId: string) {
      if (this.userClaimsListeners.has(userId)) {
          const claims = this.claims.filter(c => c.userId === userId);
          this.userClaimsListeners.get(userId)?.forEach(cb => cb(claims));
      }
  }

  private notifyUserTicketsListeners(userId: string) {
      if (this.userTicketsListeners.has(userId)) {
          const tickets = this.tickets.filter(t => t.userId === userId);
          this.userTicketsListeners.get(userId)?.forEach(cb => cb(tickets));
      }
  }

  private notifyNotificationListeners(userId: string, message: string) {
      if(this.notificationListeners.has(userId)) {
          this.notificationListeners.get(userId)?.forEach(cb => cb(message));
      }
  }

  // --- EMAIL SIMULATION ---
  private sendMockEmail(toEmail: string, subject: string, body: string) {
    console.log(`[MOCK EMAIL] TO: ${toEmail} | SUBJ: ${subject}`);
    // Also trigger in-app notification
    const user = this.users.find(u => u.email === toEmail);
    if(user) {
        this.notifyNotificationListeners(user.uid, `Email sent: ${subject}`);
    }
  }

  // Auth Simulation
  async login(email: string, role: 'user' | 'admin'): Promise<SystemUser> {
    await new Promise(r => setTimeout(r, 800));
    const isVerified = role === 'admin'; 
    const user: SystemUser = {
      uid: role === 'admin' ? 'admin_123' : `user_${Math.random().toString(36).substr(2, 9)}`,
      email,
      role,
      displayName: role === 'admin' ? 'System Administrator' : 'John Doe',
      isVerified: isVerified,
      createdAt: Date.now()
    };
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
    return user;
  }

  getCurrentUser(): SystemUser | null {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return u ? JSON.parse(u) : null;
  }

  async logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  async verifyCurrentUser(): Promise<void> {
    await new Promise(r => setTimeout(r, 1500));
    if (typeof window !== 'undefined') {
        const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (userJson) {
            const user = JSON.parse(userJson);
            user.isVerified = true;
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        }
    }
  }
  
  async sendVerificationEmail(email: string): Promise<string> {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.sendMockEmail(email, "Verify Account", `Code: ${code}`);
    return code;
  }

  // Items
  async getItems(filter?: { type?: 'lost' | 'found', status?: string }): Promise<Item[]> {
    this.loadFromStorage();
    let res = [...this.items];
    if (filter?.type) res = res.filter(i => i.itemType === filter.type);
    if (filter?.status) res = res.filter(i => i.status === filter.status);
    return res;
  }

  async getItemById(id: string): Promise<Item | undefined> {
    this.loadFromStorage();
    return this.items.find(i => i.id === id);
  }

  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const newItem: Item = {
      ...item,
      id: `item_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.items.unshift(newItem);
    this.saveToStorage();
    this.notifyUserItemsListeners(newItem.userId);
    return newItem;
  }

  async updateItemStatus(itemId: string, newStatus: Item['status']): Promise<void> {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    item.status = newStatus;
    item.updatedAt = Date.now();
    this.saveToStorage();
    this.notifyUserItemsListeners(item.userId);

    if (item.itemType === 'lost' && newStatus === 'match_found') {
        this.sendMockEmail("user@demo.com", "Match Found", "A potential match has been found for your item.");
    }
  }

  async resolveLostItem(itemId: string, userId: string): Promise<void> {
    const item = this.items.find(i => i.id === itemId && i.userId === userId);
    if(!item) throw new Error("Unauthorized");

    item.status = 'resolved';
    item.updatedAt = Date.now();

    const ticket = this.tickets.find(t => t.relatedItemId === itemId);
    if(ticket) {
      ticket.status = 'resolved';
      ticket.messages.push({
        id: `msg_sys_${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        content: 'Item marked as resolved by owner. Ticket closed.',
        timestamp: Date.now(),
        read: true,
        isAdmin: true
      });
      this.notifyTicketListeners(ticket.id);
    }
    this.saveToStorage();
    this.notifyUserItemsListeners(userId);
  }

  // Claims
  async createClaim(claim: Omit<ClaimRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClaimRequest> {
    const newClaim: ClaimRequest = {
      ...claim,
      id: `claim_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.claims.unshift(newClaim);
    this.saveToStorage();
    this.notifyUserClaimsListeners(newClaim.userId);
    return newClaim;
  }

  async getClaimsByUser(userId: string): Promise<ClaimRequest[]> {
    this.loadFromStorage();
    return this.claims.filter(c => c.userId === userId);
  }

  async approveClaim(claimId: string, adminId: string): Promise<void> {
    const claim = this.claims.find(c => c.id === claimId);
    if(!claim) throw new Error("Claim not found");

    claim.status = 'approved';
    const item = this.items.find(i => i.id === claim.itemId);
    if(item) {
        item.status = 'resolved';
        this.notifyUserItemsListeners(item.userId);
    }

    const ticket = this.tickets.find(t => t.relatedClaimId === claimId);
    if(ticket) {
      ticket.status = 'resolved';
      ticket.messages.push({
        id: `msg_sys_${Date.now()}`,
        senderId: adminId,
        senderName: 'System',
        content: 'CLAIM APPROVED. Please collect your item.',
        timestamp: Date.now(),
        read: false,
        isAdmin: true
      });
      this.notifyTicketListeners(ticket.id);
    }
    
    this.saveToStorage();
    this.notifyUserClaimsListeners(claim.userId);
    this.sendMockEmail('user@demo.com', 'Claim Approved!', 'Your claim has been approved.');
  }

  async rejectClaim(claimId: string, adminId: string, reason: string): Promise<void> {
    const claim = this.claims.find(c => c.id === claimId);
    if(!claim) throw new Error("Claim not found");
    claim.status = 'rejected';
    
    const ticket = this.tickets.find(t => t.relatedClaimId === claimId);
    if(ticket) {
      ticket.messages.push({
        id: `msg_sys_${Date.now()}`,
        senderId: adminId,
        senderName: 'System',
        content: `CLAIM REJECTED: ${reason}`,
        timestamp: Date.now(),
        read: false,
        isAdmin: true
      });
      this.notifyTicketListeners(ticket.id);
    }
    this.saveToStorage();
    this.notifyUserClaimsListeners(claim.userId);
  }

  // Tickets
  async createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Ticket> {
    const newTicket: Ticket = {
      ...ticket,
      id: `ticket_${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.tickets.unshift(newTicket);
    this.saveToStorage();
    this.notifyUserTicketsListeners(newTicket.userId);
    return newTicket;
  }

  async addMessage(ticketId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const newMessage: Message = {
      ...message,
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = Date.now();
    this.saveToStorage();
    this.notifyTicketListeners(ticketId);
    return newMessage;
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    this.loadFromStorage();
    return this.tickets.filter(t => t.userId === userId);
  }
  
  async updateTicketStatus(ticketId: string, status: Ticket['status']): Promise<void> {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = Date.now();
      this.saveToStorage();
      this.notifyTicketListeners(ticketId);
    }
  }

  // --- REAL TIME SUBSCRIPTIONS ---
  
  subscribeToTicket(ticketId: string, callback: (ticket: Ticket) => void) {
      if (!this.ticketListeners.has(ticketId)) {
          this.ticketListeners.set(ticketId, []);
      }
      this.ticketListeners.get(ticketId)?.push(callback);
      // Immediate callback
      const ticket = this.tickets.find(t => t.id === ticketId);
      if(ticket) callback(ticket);

      return () => {
          const listeners = this.ticketListeners.get(ticketId) || [];
          this.ticketListeners.set(ticketId, listeners.filter(cb => cb !== callback));
      };
  }

  subscribeToStats(callback: (stats: DashboardStats) => void) {
      this.statsListeners.push(callback);
      callback(this.getDashboardStats());
      return () => {
          this.statsListeners = this.statsListeners.filter(cb => cb !== callback);
      };
  }

  subscribeToUserItems(userId: string, callback: (items: Item[]) => void) {
      if(!this.userItemsListeners.has(userId)) this.userItemsListeners.set(userId, []);
      this.userItemsListeners.get(userId)?.push(callback);
      callback(this.items.filter(i => i.userId === userId));
      return () => {
          const l = this.userItemsListeners.get(userId) || [];
          this.userItemsListeners.set(userId, l.filter(cb => cb !== callback));
      };
  }

  subscribeToUserClaims(userId: string, callback: (claims: ClaimRequest[]) => void) {
      if(!this.userClaimsListeners.has(userId)) this.userClaimsListeners.set(userId, []);
      this.userClaimsListeners.get(userId)?.push(callback);
      callback(this.claims.filter(c => c.userId === userId));
      return () => {
          const l = this.userClaimsListeners.get(userId) || [];
          this.userClaimsListeners.set(userId, l.filter(cb => cb !== callback));
      };
  }

  subscribeToUserTickets(userId: string, callback: (tickets: Ticket[]) => void) {
      if(!this.userTicketsListeners.has(userId)) this.userTicketsListeners.set(userId, []);
      this.userTicketsListeners.get(userId)?.push(callback);
      callback(this.tickets.filter(t => t.userId === userId));
      return () => {
          const l = this.userTicketsListeners.get(userId) || [];
          this.userTicketsListeners.set(userId, l.filter(cb => cb !== callback));
      };
  }

  subscribeToNotifications(userId: string, callback: (msg: string) => void) {
      if(!this.notificationListeners.has(userId)) this.notificationListeners.set(userId, []);
      this.notificationListeners.get(userId)?.push(callback);
      return () => {
           const l = this.notificationListeners.get(userId) || [];
           this.notificationListeners.set(userId, l.filter(cb => cb !== callback));
      }
  }

  // CCTV
  async getCCTVClips(): Promise<CCTVClip[]> {
    this.loadFromStorage();
    return this.cctvClips;
  }

  async uploadCCTVClip(clip: Omit<CCTVClip, 'id'>): Promise<CCTVClip> {
    const newClip: CCTVClip = {
      ...clip,
      id: `cctv_${Math.random().toString(36).substr(2, 9)}`
    };
    this.cctvClips.unshift(newClip);
    this.saveToStorage();
    return newClip;
  }

  async deleteCCTVClip(id: string): Promise<void> {
    this.cctvClips = this.cctvClips.filter(c => c.id !== id);
    this.saveToStorage();
  }

  async shareCCTVToTicket(ticketId: string, clip: CCTVClip, adminId: string): Promise<void> {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.messages.push({
      id: `msg_sys_${Date.now()}`,
      senderId: adminId,
      senderName: 'Admin Support',
      content: `I've attached CCTV footage from ${clip.stationId}. [[CCTV:${clip.id}]]`,
      attachmentUrl: clip.thumbnailUrl,
      timestamp: Date.now(),
      read: false,
      isAdmin: true
    });
    if (ticket.status === 'resolved') ticket.status = 'in-progress';
    this.saveToStorage();
    this.notifyTicketListeners(ticketId);
  }

  // Live Cameras
  async getCameras(): Promise<CCTVCamera[]> {
      this.loadFromStorage();
      return this.cameras;
  }

  async addCamera(camera: Omit<CCTVCamera, 'id' | 'status'>): Promise<CCTVCamera> {
      const newCam: CCTVCamera = {
          ...camera,
          id: `cam_${Math.random().toString(36).substr(2, 9)}`,
          status: 'online'
      };
      this.cameras.push(newCam);
      this.saveToStorage();
      return newCam;
  }
  
  async deleteCamera(id: string): Promise<void> {
      this.cameras = this.cameras.filter(c => c.id !== id);
      this.saveToStorage();
  }

  // Admin
  async getAllClaims(): Promise<ClaimRequest[]> {
    this.loadFromStorage();
    return this.claims;
  }
  
  async getAllTickets(): Promise<Ticket[]> {
    this.loadFromStorage();
    return this.tickets;
  }

  getDashboardStats(): DashboardStats {
    this.loadFromStorage();
    return {
      totalLost: this.items.filter(i => i.itemType === 'lost').length,
      totalFound: this.items.filter(i => i.itemType === 'found').length,
      activeClaims: this.claims.filter(c => c.status !== 'approved' && c.status !== 'rejected').length,
      resolvedItems: this.items.filter(i => i.status === 'resolved').length
    };
  }
}

export const db = new MockFirebaseService();
