import { FILE_LIMITS } from './constants';
import DOMPurify from 'isomorphic-dompurify';

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

/**
 * Sanitizes input text to remove malicious scripts.
 * Returns the clean string.
 */
export const sanitizeInput = (text: string): string => {
  return DOMPurify.sanitize(text).trim();
};

/**
 * Checks if the input contained malicious content.
 * Useful for form validation rejection.
 */
export const isMaliciousInput = (text: string): boolean => {
  const clean = DOMPurify.sanitize(text);
  // If sanitization removed content (stripping tags), it might be malicious or just HTML
  // For strict text-only fields, any HTML tag is considered "malicious" or invalid.
  return clean !== text;
};