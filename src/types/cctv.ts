export interface CCTVConfig {
  id: string;
  name: string;
  stationId: string;
  line: string;
  ipAddress: string;
  port: number;
  status: 'online' | 'offline' | 'maintenance';
  lastActive?: Date | null;
  location: string;
  streamUrl: string;
  isRecording: boolean;
  motionDetection: boolean;
  objectDetection: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CCTVFeed {
  id: string;
  cameraId: string;
  timestamp: Date;
  imageUrl?: string;
  videoUrl?: string;
  detectedObjects?: DetectedObject[];
  motionDetected: boolean;
  confidence: number;
}

export interface DetectedObject {
  id: string;
  type: 'person' | 'bag' | 'phone' | 'wallet' | 'unknown';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: Date;
}

export interface MotionEvent {
  id: string;
  cameraId: string;
  timestamp: Date;
  duration: number;
  intensity: number;
  snapshotUrl?: string;
  reviewed: boolean;
}

export interface CCTVStats {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  maintenanceCameras: number;
  motionEventsToday: number;
  objectsDetectedToday: number;
  storageUsed: number;
  storageTotal: number;
}

// Type guards for runtime type checking
export const isDetectedObject = (event: unknown): event is DetectedObject => {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    'confidence' in event &&
    'boundingBox' in event
  );
};

export const isMotionEvent = (event: unknown): event is MotionEvent => {
  return (
    typeof event === 'object' &&
    event !== null &&
    'cameraId' in event &&
    'duration' in event &&
    'intensity' in event &&
    !('type' in event) // Motion events don't have 'type'
  );
};