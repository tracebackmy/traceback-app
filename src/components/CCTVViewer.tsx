'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CCTVConfig, DetectedObject } from '@/types/cctv';

interface CCTVViewerProps {
  camera: CCTVConfig;
  showDetection?: boolean;
  onObjectDetected?: (objects: DetectedObject[]) => void;
  className?: string;
}

export default function CCTVViewer({ 
  camera, 
  showDetection = false, 
  onObjectDetected,
  className = '' 
}: CCTVViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // FIX: Initialize with null to satisfy TypeScript
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Move drawDetectionBoxes to the top to fix the access-before-declaration error
  const drawDetectionBoxes = useCallback((objects: DetectedObject[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detection boxes only if we have valid dimensions
    if (canvas.width === 0 || canvas.height === 0) return;

    objects.forEach(obj => {
      const { x, y, width, height } = obj.boundingBox;
      const boxX = x * canvas.width;
      const boxY = y * canvas.height;
      const boxWidth = width * canvas.width;
      const boxHeight = height * canvas.height;

      // Choose color based on object type
      const colors: Record<DetectedObject['type'], string> = {
        person: '#FF385C',
        bag: '#10B981',
        phone: '#3B82F6',
        wallet: '#F59E0B',
        unknown: '#6B7280'
      };

      const color = colors[obj.type] || '#6B7280';

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Draw label background
      ctx.fillStyle = color;
      const labelWidth = ctx.measureText(`${obj.type} (${Math.round(obj.confidence * 100)}%)`).width + 8;
      ctx.fillRect(boxX, boxY - 20, labelWidth, 20);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px system-ui';
      ctx.fillText(
        `${obj.type} (${Math.round(obj.confidence * 100)}%)`,
        boxX + 4,
        boxY - 6
      );
    });
  }, []);

  // Safe stream URL setup with error handling
  const setupVideoStream = useCallback(() => {
    if (!videoRef.current || !camera.streamUrl) {
      setError('Video element or stream URL not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const video = videoRef.current;
    
    // Clear previous source
    video.src = '';
    
    try {
      video.src = camera.streamUrl;
      
      video.onloadeddata = () => {
        setIsLoading(false);
        if (canvasRef.current && video.videoWidth && video.videoHeight) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      };

      video.onerror = () => {
        setIsLoading(false);
        setError(`Failed to load video stream from ${camera.name}`);
      };

      video.load();
    } catch (err) {
      setIsLoading(false);
      setError('Error setting up video stream');
      console.error('Video stream setup error:', err);
    }
  }, [camera.streamUrl, camera.name]);

  // Simulate object detection for demo purposes
  const simulateObjectDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !showDetection) return;

    const objects: DetectedObject[] = [];
    const types: DetectedObject['type'][] = ['person', 'bag', 'phone', 'wallet', 'unknown'];
    
    // Generate 1-3 random detected objects
    const objectCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < objectCount; i++) {
      objects.push({
        id: `obj-${Date.now()}-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        boundingBox: {
          x: Math.random() * 0.8,
          y: Math.random() * 0.8,
          width: Math.random() * 0.2 + 0.1,
          height: Math.random() * 0.2 + 0.1
        },
        timestamp: new Date()
      });
    }

    setDetectedObjects(objects);
    onObjectDetected?.(objects);
    drawDetectionBoxes(objects);
  }, [showDetection, onObjectDetected, drawDetectionBoxes]);

  // Setup video stream effect
  useEffect(() => {
    setupVideoStream();
  }, [setupVideoStream]);

  // Setup detection interval when showDetection changes
  useEffect(() => {
    if (showDetection && camera.objectDetection) {
      detectionIntervalRef.current = setInterval(simulateObjectDetection, 3000);
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [showDetection, camera.objectDetection, simulateObjectDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, []);

  const getStatusColor = (status: CCTVConfig['status']): string => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: CCTVConfig['status']): string => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  };

  const handleRetry = () => {
    setError('');
    setupVideoStream();
  };

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Camera Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800">
        <div className="flex items-center space-x-3">
          <div 
            className={`w-3 h-3 rounded-full ${getStatusColor(camera.status)}`}
            title={getStatusText(camera.status)}
          />
          <div>
            <h3 className="font-medium text-white">{camera.name}</h3>
            <p className="text-sm text-gray-400">{camera.location}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {camera.motionDetection && (
            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded" title="Motion Detection Enabled">
              Motion
            </span>
          )}
          {camera.objectDetection && (
            <span className="px-2 py-1 text-xs bg-green-500 text-white rounded" title="AI Detection Enabled">
              AI
            </span>
          )}
          {camera.isRecording && (
            <span className="px-2 py-1 text-xs bg-red-500 text-white rounded animate-pulse" title="Recording Active">
              REC
            </span>
          )}
        </div>
      </div>

      {/* Video Stream */}
      <div className="relative aspect-video bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Connecting to {camera.name}...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-red-400 text-center p-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm mb-3">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-[#FF385C] text-white rounded hover:bg-[#E31C5F] transition-colors text-sm"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          title={`Live feed from ${camera.name}`}
        />

        {/* Detection Canvas Overlay */}
        {showDetection && camera.objectDetection && !error && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        )}

        {/* Timestamp Overlay */}
        {!error && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {new Date().toLocaleTimeString()}
          </div>
        )}

        {/* Detected Objects Counter */}
        {showDetection && detectedObjects.length > 0 && !error && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {detectedObjects.length} object{detectedObjects.length !== 1 ? 's' : ''} detected
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-800">
        <div className="flex space-x-2">
          <button 
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Zoom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
            onClick={handleRetry}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            title="Take Snapshot"
          >
            Snapshot
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded transition-colors ${
              camera.isRecording 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
            title={camera.isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {camera.isRecording ? 'Stop' : 'Record'}
          </button>
        </div>
      </div>

      {/* Detection Details */}
      {showDetection && detectedObjects.length > 0 && (
        <div className="p-3 bg-gray-800 border-t border-gray-700">
          <h4 className="text-sm font-medium text-white mb-2">Detected Objects</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {detectedObjects.map(obj => (
              <div key={obj.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: 
                        obj.type === 'person' ? '#FF385C' :
                        obj.type === 'bag' ? '#10B981' :
                        obj.type === 'phone' ? '#3B82F6' :
                        obj.type === 'wallet' ? '#F59E0B' : '#6B7280'
                    }}
                  />
                  <span className="text-gray-300 capitalize">{obj.type}</span>
                </div>
                <span className="text-gray-400">{Math.round(obj.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}