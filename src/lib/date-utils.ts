import { Timestamp } from 'firebase/firestore';

export const safeDateConvert = (timestamp: unknown): Date => {
  if (!timestamp) return new Date();
  
  try {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
      return (timestamp as { toDate: () => Date }).toDate();
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else {
      return new Date(timestamp as string);
    }
  } catch {
    return new Date();
  }
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};