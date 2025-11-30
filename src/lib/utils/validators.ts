
import { FILE_LIMITS } from './constants';

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePasswordStrength = (password: string): boolean => {
  // Min 8 chars, at least one number
  return password.length >= 8 && /\d/.test(password);
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!FILE_LIMITS.ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image.' };
  }
  if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
    return { valid: false, error: 'File size too large. Maximum 5MB.' };
  }
  return { valid: true };
};

export const isMaliciousInput = (text: string): boolean => {
  // Basic XSS check
  return /<script\b[^>]*>([\s\S]*?)<\/script>/gm.test(text);
};
