
export type UserRole = 'user' | 'admin';

export interface SystemUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  phoneNumber?: string;
  isVerified: boolean;
  photoURL?: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface UserProfile extends Omit<SystemUser, 'role'> {
  preferences?: {
    notifications: boolean;
    newsletter: boolean;
  };
}
