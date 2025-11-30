
export interface CCTVClip {
  id: string;
  stationId: string;
  cameraLocation: string;
  timestamp: number;
  thumbnailUrl: string;
  duration: string;
  notes?: string;
}

export interface CCTVCamera {
  id: string;
  stationId: string;
  location: string;
  streamUrl: string;
  status: 'online' | 'offline' | 'maintenance';
}
