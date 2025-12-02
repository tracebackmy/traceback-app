'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // Reset state when camera changes
    setError('');
    setStatus('connecting');

    const startWebRTC = async () => {
      if (!videoRef.current || !camera.streamUrl) {
        setError('Invalid stream configuration');
        setStatus('failed');
        return;
      }

      // Close any existing connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      try {
        // 1. Create Peer Connection
        // We use Google's public STUN server to help punch through NATs
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // 2. Add Transceiver (Direction: Receive Only)
        // We only want to watch video, not send audio/video back
        pc.addTransceiver('video', { direction: 'recvonly' });

        // 3. Create Offer (Browser capabilities)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 4. Send Offer to go2rtc API via Cloudflare Tunnel
        // camera.streamUrl should be your cloudflare domain: e.g., "https://cctv.yourdomain.com"
        // camera.id should match the stream name in go2rtc.yaml: e.g., "cam1"
        const streamName = camera.id; 
        
        // Construct the API URL. 
        // NOTE: Ensure your Cloudflare tunnel maps to the go2rtc API port (1984)
        const apiUrl = `${camera.streamUrl}/api/webrtc?src=${streamName}`;

        console.log(`Connecting to ${apiUrl}...`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Content-Type': 'application/sdp' // go2rtc expects plain text/sdp often, but let's try raw body
          }
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status} ${response.statusText}`);

        const answerSdp = await response.text();

        // 5. Set Remote Description (Server capabilities)
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp
        }));

        // 6. Handle Track Event (When video starts flowing)
        pc.ontrack = (event) => {
          console.log('Track received:', event.streams[0]);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            // Ensure autoplay works (browsers block autoplay with audio often, so muted is key)
            videoRef.current.play().catch(e => console.error("Autoplay prevented:", e));
            setStatus('connected');
          }
        };

        // Connection State Monitoring
        pc.onconnectionstatechange = () => {
            console.log("Connection state:", pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                setStatus('failed');
                setError('Connection lost');
            }
        };

      } catch (err: any) {
        console.error('WebRTC Error:', err);
        setStatus('failed');
        setError(err.message || 'Connection failed');
      }
    };

    startWebRTC();

    // Cleanup on unmount
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [camera.streamUrl, camera.id]);

  return (
    <div className={`bg-black rounded-lg overflow-hidden relative aspect-video ${className}`}>
      
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        controls={false} // Hide controls for a cleaner CCTV look
      />
      
      {/* Status Overlays */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white z-10">
           <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C] mb-2"></div>
              <p className="text-xs font-medium">Connecting to {camera.name}...</p>
           </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center px-4">
            <svg className="w-10 h-10 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <button 
                onClick={() => window.location.reload()} // Simple retry strategy
                className="mt-3 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors"
            >
                Retry
            </button>
          </div>
        </div>
      )}
      
      {/* Live Badge */}
      {status === 'connected' && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] font-bold flex items-center gap-1.5 z-20 border border-white/10">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
          LIVE
        </div>
      )}
    </div>
  );
}