// Shared admin configuration
export const ADMIN_USERS = [
  { email: 'tracebackfyp@gmail.com', role: 'super-admin' },
  // Add more admin emails as needed
];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_USERS.some(admin => admin.email === email);
};