import { Timestamp } from 'firebase/firestore';
import { CCTVConfig, DetectedObject, MotionEvent } from './cctv';

// Firestore-compatible interfaces
export interface CCTVConfigFirestore extends Omit<CCTVConfig, 'createdAt' | 'updatedAt' | 'lastActive'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActive?: Timestamp | null;
}

export interface DetectedObjectFirestore extends Omit<DetectedObject, 'timestamp'> {
  timestamp: Timestamp;
}

export interface MotionEventFirestore extends Omit<MotionEvent, 'timestamp'> {
  timestamp: Timestamp;
}

// Conversion utilities
export const convertToCCTVConfig = (firestoreData: CCTVConfigFirestore): CCTVConfig => ({
  ...firestoreData,
  createdAt: firestoreData.createdAt.toDate(),
  updatedAt: firestoreData.updatedAt.toDate(),
  lastActive: firestoreData.lastActive?.toDate() || null,
});

export const convertToDetectedObject = (firestoreData: DetectedObjectFirestore): DetectedObject => ({
  ...firestoreData,
  timestamp: firestoreData.timestamp.toDate(),
});

export const convertToMotionEvent = (firestoreData: MotionEventFirestore): MotionEvent => ({
  ...firestoreData,
  timestamp: firestoreData.timestamp.toDate(),
});