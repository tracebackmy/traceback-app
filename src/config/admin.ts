// src/config/admin.ts
// Centralized list of emails authorized to hold the 'admin' role in Firebase.

export const ADMIN_USERS = [
  { email: 'tracebackfyp@gmail.com', role: 'admin' },
  // NOTE: In a real system, this list would be managed by a Cloud Function 
  // and Custom Claims, but for this project, this serves as the authorization whitelist.
  // Add more admin emails here:
  // { email: 'station_manager@tracebackmy.com', role: 'admin' },
];