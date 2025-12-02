'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/components/AdminProvider';
import CCTVViewer from '@/components/CCTVViewer';
import { CCTVConfig, CCTVStats, DetectedObject, MotionEvent } from '@/types/cctv';

// Mock data for demonstration
// In a real app, these IDs would match your go2rtc.yaml stream names
// and streamUrl would be your public Cloudflare tunnel URL
const PUBLIC_CCTV_URL = 'https://cctv.tracebackmy.com'; // Replace with your actual tunnel URL

const mockCameras: CCTVConfig[] = [
  {
    id: 'main_entrance', // MUST match go2rtc.yaml stream name
    name: 'Main Entrance',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.100',
    port: 554,
    status: 'online',
    location: 'North Entrance',
    streamUrl: PUBLIC_CCTV_URL, // Base URL for the API
    isRecording: true,
    motionDetection: true,
    objectDetection: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ticket_counter', // MUST match go2rtc.yaml stream name
    name: 'Ticket Counter',
    stationId: 'KL Sentral',
    line: 'Kajang Line',
    ipAddress: '192.168.1.101',
    port: 554,
    status: 'online',
    location: 'Main Hall',
    streamUrl: PUBLIC_CCTV_URL,
    isRecording: true,
    motionDetection: true,
    objectDetection: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Add more cameras matching your go2rtc config
];

export default function CCTVPage() {
  const { admin } = useAdmin();
  const [cameras, setCameras] = useState<CCTVConfig[]>(mockCameras);
  const [selectedCamera, setSelectedCamera] = useState<CCTVConfig | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [loading, setLoading] = useState(true);

  // Initialize CCTV system
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Camera management functions
  const updateCameraStatus = (cameraId: string, status: CCTVConfig['status']) => {
    setCameras(prev => 
      prev.map(cam => 
        cam.id === cameraId ? { ...cam, status, updatedAt: new Date() } : cam
      )
    );
    if (selectedCamera?.id === cameraId) {
      setSelectedCamera(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div>
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
            <p className="text-gray-600 mt-2">Real-time surveillance via WebRTC</p>
          </div>
          
          <div className="flex gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'grid' ? 'Single View' : 'Grid View'}
            </button>
          </div>
        </div>

        {/* Camera Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {cameras.map(camera => (
              <div key={camera.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                 <div className="flex justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{camera.name}</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Online</span>
                 </div>
                 <CCTVViewer
                    camera={camera}
                    className="w-full aspect-video rounded-lg"
                  />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Camera View */}
            <div className="lg:col-span-2">
              {selectedCamera ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">{selectedCamera.name} Live Feed</h3>
                    <CCTVViewer
                      camera={selectedCamera}
                      className="w-full h-full rounded-lg"
                    />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-xl aspect-video flex items-center justify-center border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">Select a camera from the list to view</p>
                </div>
              )}
            </div>

            {/* Camera List */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Available Cameras</h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto p-2">
                  {cameras.map(camera => (
                    <button
                      key={camera.id}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-colors flex items-center justify-between ${
                        selectedCamera?.id === camera.id 
                          ? 'bg-pink-50 border border-pink-200' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => setSelectedCamera(camera)}
                    >
                      <div>
                        <p className={`font-medium ${selectedCamera?.id === camera.id ? 'text-[#FF385C]' : 'text-gray-900'}`}>
                            {camera.name}
                        </p>
                        <p className="text-xs text-gray-500">{camera.location}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}