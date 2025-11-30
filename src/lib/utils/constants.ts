
export const APP_NAME = 'TraceBack';

export const ITEM_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Personal Accessories',
  'Documents',
  'Bags',
  'Other'
];

export const TRANSIT_MODES = ['MRT', 'LRT', 'KTM'];

export const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-yellow-100 text-yellow-800',
  pending_verification: 'bg-orange-100 text-orange-800',
  listed: 'bg-green-100 text-green-800',
  match_found: 'bg-blue-100 text-blue-800',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-200 text-gray-500',
  
  // Claims
  'claim-submitted': 'bg-blue-50 text-blue-700',
  'under-review-triage': 'bg-yellow-50 text-yellow-700',
  'verification-chat': 'bg-purple-50 text-purple-700',
  'approved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
};

export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BROWSE: '/browse',
  REPORT: '/report',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    ITEMS: '/admin/items',
    CLAIMS: '/admin/claims',
    CCTV: '/admin/cctv',
    TICKETS: '/admin/tickets'
  }
};
