'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/components/AdminProvider';
import CCTVViewer from '@/components/CCTVViewer';
import { CCTVConfig, CCTVStats, DetectedObject, MotionEvent, isDetectedObject, isMotionEvent } from '@/types/cctv';
import { cctvManager } from '@/lib/cctv-ai';
import { safeDateConvert } from '@/lib/date-utils';

// Mock data for demonstration
const mockCameras: CCTVConfig[] = [
  {
    id: 'cam-1',
    name: 'Main Entrance',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.100',
    port: 554,
    status: 'online',
    location: 'North Entrance - Turnstiles',
    streamUrl: 'https://sample-streams.vercel.app/stream1.mp4',
    isRecording: true,
    motionDetection: true,
    objectDetection: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  },
  {
    id: 'cam-2',
    name: 'Ticket Counter',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.101',
    port: 554,
    status: 'online',
    location: 'Main Ticket Hall - Counter 1-5',
    streamUrl: 'https://sample-streams.vercel.app/stream2.mp4',
    isRecording: true,
    motionDetection: true,
    objectDetection: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  },
  {
    id: 'cam-3',
    name: 'Platform A',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.102',
    port: 554,
    status: 'maintenance',
    location: 'Platform A - North End',
    streamUrl: 'https://sample-streams.vercel.app/stream3.mp4',
    isRecording: false,
    motionDetection: false,
    objectDetection: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date()
  },
  {
    id: 'cam-4',
    name: 'Baggage Area',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.103',
    port: 554,
    status: 'offline',
    location: 'Baggage Claim - Carousel 1',
    streamUrl: 'https://sample-streams.vercel.app/stream4.mp4',
    isRecording: false,
    motionDetection: true,
    objectDetection: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date()
  }
];

export default function CCTVPage() {
  const { admin } = useAdmin();
  const [cameras, setCameras] = useState<CCTVConfig[]>(mockCameras);
  const [selectedCamera, setSelectedCamera] = useState<CCTVConfig | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [showDetection, setShowDetection] = useState(true);
  const [recentEvents, setRecentEvents] = useState<(DetectedObject | MotionEvent)[]>([]);
  const [stats, setStats] = useState<CCTVStats>({
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    maintenanceCameras: 0,
    motionEventsToday: 0,
    objectsDetectedToday: 0,
    storageUsed: 0,
    storageTotal: 1000
  });
  const [loading, setLoading] = useState(true);

  // Event handlers with stable references
  const handleObjectDetected = useCallback((objects: DetectedObject[]) => {
    setRecentEvents(prev => [...objects, ...prev.slice(0, 9)]);
    setStats(prev => ({
      ...prev,
      objectsDetectedToday: prev.objectsDetectedToday + objects.length
    }));
  }, []);

  const handleMotionDetected = useCallback((event: MotionEvent) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
    setStats(prev => ({
      ...prev,
      motionEventsToday: prev.motionEventsToday + 1
    }));
  }, []);

  // Update stats function - FIXED: No circular dependency
  const updateStats = useCallback(() => {
    const cameraStats = cctvManager.getCameraStats();
    setStats(prev => ({
      ...prev,
      totalCameras: cameraStats.total,
      onlineCameras: cameraStats.online,
      offlineCameras: cameraStats.offline,
      maintenanceCameras: cameraStats.maintenance,
      storageUsed: Math.min(prev.storageUsed + Math.random() * 5, prev.storageTotal)
    }));
  }, []);

  // Initialize CCTV system - FIXED: No circular dependency
  const initializeCCTV = useCallback(async () => {
    try {
      // Initialize CCTV manager with mock cameras
      mockCameras.forEach(camera => {
        cctvManager.addCamera(camera);
      });

      // Set up event listeners
      mockCameras.forEach(camera => {
        cctvManager.onObjectDetected(camera.id, handleObjectDetected);
        cctvManager.onMotionDetected(camera.id, handleMotionDetected);
      });

      // Initialize AI service
      await cctvManager.initialize();
      
      // Calculate initial stats
      updateStats();
      setLoading(false);
    } catch (error) {
      console.error('Error initializing CCTV system:', error);
      setLoading(false);
    }
  }, [handleObjectDetected, handleMotionDetected, updateStats]);

  // Camera management functions
  const updateCameraStatus = useCallback(async (cameraId: string, status: CCTVConfig['status']) => {
    try {
      cctvManager.updateCamera(cameraId, { status });
      setCameras(prev => 
        prev.map(cam => 
          cam.id === cameraId ? { ...cam, status, updatedAt: new Date() } : cam
        )
      );
      
      if (selectedCamera?.id === cameraId) {
        setSelectedCamera(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
      }
      
      updateStats();
    } catch (error) {
      console.error('Error updating camera status:', error);
    }
  }, [selectedCamera, updateStats]);

  const toggleRecording = useCallback((cameraId: string) => {
    const camera = cameras.find(cam => cam.id === cameraId);
    if (camera) {
      const newRecordingState = !camera.isRecording;
      cctvManager.updateCamera(cameraId, { isRecording: newRecordingState });
      setCameras(prev =>
        prev.map(cam =>
          cam.id === cameraId ? { ...cam, isRecording: newRecordingState, updatedAt: new Date() } : cam
        )
      );
      
      if (selectedCamera?.id === cameraId) {
        setSelectedCamera(prev => prev ? { ...prev, isRecording: newRecordingState, updatedAt: new Date() } : null);
      }
    }
  }, [cameras, selectedCamera]);

  const toggleDetectionFeature = useCallback((cameraId: string, feature: 'motionDetection' | 'objectDetection', enabled: boolean) => {
    cctvManager.updateCamera(cameraId, { [feature]: enabled });
    setCameras(prev =>
      prev.map(cam =>
        cam.id === cameraId ? { ...cam, [feature]: enabled, updatedAt: new Date() } : cam
      )
    );
    
    if (selectedCamera?.id === cameraId) {
      setSelectedCamera(prev => prev ? { ...prev, [feature]: enabled, updatedAt: new Date() } : null);
    }
  }, [selectedCamera]);

  const getStoragePercentage = useCallback(() => {
    return (stats.storageUsed / stats.storageTotal) * 100;
  }, [stats.storageUsed, stats.storageTotal]);

  const getEventDescription = useCallback((event: DetectedObject | MotionEvent): string => {
    if (isDetectedObject(event)) {
      return `Object Detected: ${event.type}`;
    } else if (isMotionEvent(event)) {
      return 'Motion Detected';
    }
    return 'Unknown Event';
  }, []);

  // FIXED: Proper useEffect without circular dependencies
  useEffect(() => {
    initializeCCTV();
  }, [initializeCCTV]);

  // Separate effect for periodic updates
  useEffect(() => {
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [updateStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CCTV Management</h1>
            <p className="text-gray-600 mt-2">Monitor station cameras and AI detection systems</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setShowDetection(!showDetection)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showDetection
                  ? 'bg-[#FF385C] text-white border-[#FF385C]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showDetection ? 'Hide AI Detection' : 'Show AI Detection'}
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'grid' ? 'Single View' : 'Grid View'}
            </button>
            
            <button className="px-4 py-2 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] transition-colors">
              Add Camera
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cameras Online</p>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.onlineCameras}/{stats.totalCameras}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.maintenanceCameras} in maintenance
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Motion Events</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.motionEventsToday}</p>
                <p className="text-xs text-gray-500 mt-1">Today</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Objects Detected</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.objectsDetectedToday}</p>
                <p className="text-xs text-gray-500 mt-1">Today</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.storageUsed.toFixed(1)}GB / {stats.storageTotal}GB
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${getStoragePercentage()}%`,
                      backgroundColor: getStoragePercentage() > 80 ? '#EF4444' : '#10B981'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cameras.map(camera => (
              <CCTVViewer
                key={camera.id}
                camera={camera}
                showDetection={showDetection}
                onObjectDetected={handleObjectDetected}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Camera View */}
            <div className="lg:col-span-2">
              {selectedCamera ? (
                <CCTVViewer
                  camera={selectedCamera}
                  showDetection={showDetection}
                  className="h-full"
                  onObjectDetected={handleObjectDetected}
                />
              ) : (
                <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
                  <p className="text-gray-400">Select a camera to view</p>
                </div>
              )}
            </div>

            {/* Camera List & Events */}
            <div className="space-y-6">
              {/* Camera List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Cameras</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {cameras.map(camera => (
                    <div
                      key={camera.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCamera?.id === camera.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedCamera(camera)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{camera.name}</p>
                          <p className="text-sm text-gray-500">{camera.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              camera.status === 'online' ? 'bg-green-500' :
                              camera.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            title={camera.status}
                          />
                          {camera.isRecording && (
                            <div 
                              className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                              title="Recording"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Events</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {recentEvents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No recent events</p>
                    </div>
                  ) : (
                    recentEvents.map((event, index) => (
                      <div key={`${isDetectedObject(event) ? event.id : `motion-${index}`}-${event.timestamp.getTime()}`} 
                           className="p-4 border-b border-gray-100">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 mt-2 rounded-full ${
                            isDetectedObject(event) ? 'bg-blue-500' : 'bg-yellow-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {getEventDescription(event)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {safeDateConvert(event.timestamp).toLocaleTimeString()}
                            </p>
                            {isDetectedObject(event) && (
                              <p className="text-xs text-gray-500">
                                Confidence: {Math.round(event.confidence * 100)}%
                              </p>
                            )}
                            {isMotionEvent(event) && (
                              <p className="text-xs text-gray-500">
                                Duration: {(event.duration / 1000).toFixed(1)}s
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Controls Bar */}
        {selectedCamera && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-900">{selectedCamera.name}</span>
                <select
                  value={selectedCamera.status}
                  onChange={(e) => updateCameraStatus(selectedCamera.id, e.target.value as CCTVConfig['status'])}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:border-[#FF385C] focus:ring-1 focus:ring-[#FF385C]"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCamera.motionDetection}
                    onChange={(e) => toggleDetectionFeature(selectedCamera.id, 'motionDetection', e.target.checked)}
                    className="rounded border-gray-300 text-[#FF385C] focus:ring-[#FF385C]"
                  />
                  <span className="text-sm text-gray-700">Motion Detection</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCamera.objectDetection}
                    onChange={(e) => toggleDetectionFeature(selectedCamera.id, 'objectDetection', e.target.checked)}
                    className="rounded border-gray-300 text-[#FF385C] focus:ring-[#FF385C]"
                  />
                  <span className="text-sm text-gray-700">AI Detection</span>
                </label>
                
                <button
                  onClick={() => toggleRecording(selectedCamera.id)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    selectedCamera.isRecording
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {selectedCamera.isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}