
'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/services/mockFirebase';
import { CCTVClip, CCTVCamera, Ticket } from '@/types';

export default function AdminCCTVPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'archive'>('live');
  const [currentTime, setCurrentTime] = useState(new Date()); 
  
  const [clips, setClips] = useState<CCTVClip[]>([]);
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [uploadData, setUploadData] = useState({
      stationId: '',
      cameraLocation: '',
      notes: '',
  });
  const [uploadThumbnail, setUploadThumbnail] = useState<string | null>(null);
  const [uploadTicketId, setUploadTicketId] = useState<string>(''); 

  const [showAddCamModal, setShowAddCamModal] = useState(false);
  const [newCamData, setNewCamData] = useState({
      stationId: '',
      location: '',
      streamUrl: ''
  });

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    const cctvData = await db.getCCTVClips();
    const cameraData = await db.getCameras();
    const tickets = await db.getAllTickets();
    
    setClips(cctvData.sort((a,b) => b.timestamp - a.timestamp));
    setCameras(cameraData);
    setActiveTickets(tickets.filter(t => t.status !== 'resolved'));
    setLoading(false);
  };

  const handleDeleteClip = async (id: string) => {
      if(confirm("Are you sure you want to delete this footage record?")) {
          await db.deleteCCTVClip(id);
          loadData();
      }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setUploadThumbnail(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsProcessing(true);
      const randomDuration = `0${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 50 + 10)}`;
      
      const newClip = await db.uploadCCTVClip({
          ...uploadData,
          timestamp: Date.now(),
          thumbnailUrl: uploadThumbnail || 'https://via.placeholder.com/400x300?text=No+Preview',
          duration: randomDuration
      });

      if (uploadTicketId) {
          await db.shareCCTVToTicket(uploadTicketId, newClip, 'admin_123');
      }

      setIsProcessing(false);
      setShowUploadModal(false);
      setUploadData({ stationId: '', cameraLocation: '', notes: '' });
      setUploadThumbnail(null);
      setUploadTicketId('');
      loadData();
      alert(uploadTicketId ? "Footage uploaded and shared to ticket successfully." : "CCTV Footage record created successfully.");
  };

  const handleShare = async () => {
      if(!showShareModal || !selectedTicketId) return;
      const clip = clips.find(c => c.id === showShareModal);
      if(!clip) return;
      setIsProcessing(true);
      await db.shareCCTVToTicket(selectedTicketId, clip, 'admin_123');
      setIsProcessing(false);
      setShowShareModal(null);
      setSelectedTicketId('');
      alert("Footage shared to ticket successfully.");
  };

  const handleAddCamera = async (e: React.FormEvent) => {
      e.preventDefault();
      await db.addCamera(newCamData);
      setShowAddCamModal(false);
      setNewCamData({ stationId: '', location: '', streamUrl: '' });
      loadData();
      alert("Camera feed added.");
  };

  const handleDeleteCamera = async (id: string) => {
      if(confirm("Are you sure you want to remove this camera feed?")) {
          await db.deleteCamera(id);
          loadData();
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-ink">CCTV Surveillance</h1>
            <p className="text-muted mt-1">Real-time monitoring and historical archive management.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-full">
            <button 
                onClick={() => setActiveTab('live')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition ${activeTab === 'live' ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-ink'}`}
            >
                Live Monitoring
            </button>
            <button 
                onClick={() => setActiveTab('archive')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition ${activeTab === 'archive' ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-ink'}`}
            >
                Footage Archive
            </button>
        </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-muted">Loading surveillance system...</div>
      ) : activeTab === 'live' ? (
          <div>
              <div className="flex justify-end mb-6">
                 <button 
                    onClick={() => setShowAddCamModal(true)}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold shadow-soft hover:bg-gray-800 transition flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add IP Camera
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {cameras.map(cam => (
                     <div key={cam.id} className="bg-white rounded-xl shadow-soft overflow-hidden border border-border flex flex-col">
                         <div className="relative aspect-video bg-black flex items-center justify-center">
                             {cam.status === 'online' && cam.streamUrl ? (
                                <video 
                                    src={cam.streamUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    muted 
                                    loop 
                                    playsInline
                                    onError={(e) => {
                                        (e.target as HTMLVideoElement).style.display = 'none';
                                        (e.target as HTMLVideoElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                             ) : (
                                 <div className="text-gray-500 text-xs uppercase tracking-widest font-bold">Signal Lost / Offline</div>
                             )}
                             
                             <div className="hidden absolute inset-0 flex items-center justify-center text-gray-500 text-xs uppercase tracking-widest font-bold">
                                 Stream Unavailable
                             </div>

                             <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1 z-10">
                                 <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                             </div>
                             
                             <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded z-10">
                                 {currentTime.toLocaleTimeString()}
                             </div>
                         </div>
                         <div className="p-4 flex justify-between items-center bg-white flex-grow">
                             <div>
                                 <h3 className="font-bold text-ink">{cam.stationId}</h3>
                                 <p className="text-xs text-muted">{cam.location}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-xs font-bold text-gray-600 uppercase">{cam.status}</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteCamera(cam.id)}
                                    className="text-gray-400 hover:text-red-500 transition ml-2"
                                    title="Remove Camera"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                             </div>
                         </div>
                     </div>
                 ))}
                 {cameras.length === 0 && (
                     <div className="col-span-3 text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                         <p className="text-muted font-medium">No cameras configured.</p>
                     </div>
                 )}
              </div>
          </div>
      ) : (
          <div>
            <div className="flex justify-end mb-6">
                <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-brand text-white px-5 py-2.5 rounded-full font-bold shadow-soft hover:bg-brand-600 transition flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload Footage
                </button>
            </div>

            {clips.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    <p className="font-bold text-gray-600">No footage records found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clips.map(clip => (
                        <article key={clip.id} className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft flex flex-col group">
                            <div className="relative aspect-video bg-gray-900 group-hover:opacity-95 transition">
                                <img src={clip.thumbnailUrl} alt="CCTV" className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/50 text-white">
                                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                </div>
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs font-mono rounded">
                                    {clip.duration}
                                </div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-ink">{clip.stationId}</h3>
                                        <p className="text-xs text-muted">{clip.cameraLocation}</p>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">{new Date(clip.timestamp).toLocaleDateString()}</span>
                                </div>
                                {clip.notes && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{clip.notes}</p>}
                                
                                <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                    <button 
                                        onClick={() => alert(`Downloading footage ${clip.id}...`)}
                                        className="flex-1 py-2 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Download
                                    </button>
                                    <button 
                                        onClick={() => setShowShareModal(clip.id)}
                                        className="flex-1 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-600 rounded-lg transition"
                                    >
                                        Send to Ticket
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClip(clip.id)}
                                        className="px-3 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
          </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Upload Archive Footage</h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Station</label>
                        <input required type="text" className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" 
                            value={uploadData.stationId} onChange={e => setUploadData({...uploadData, stationId: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Camera Location/ID</label>
                        <input required type="text" className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" 
                            value={uploadData.cameraLocation} onChange={e => setUploadData({...uploadData, cameraLocation: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Notes</label>
                        <textarea className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" rows={2}
                            value={uploadData.notes} onChange={e => setUploadData({...uploadData, notes: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Thumbnail/File</label>
                        <input type="file" accept="image/*" onChange={handleThumbnailChange} className="w-full text-sm text-gray-500" />
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-sm font-bold mb-1 text-brand">Associate with Ticket (Optional)</label>
                        <p className="text-xs text-muted mb-2">Select an active ticket to immediately share this footage.</p>
                        <select 
                            className="w-full bg-white border rounded-lg p-2 text-sm text-gray-900 font-medium"
                            value={uploadTicketId}
                            onChange={(e) => setUploadTicketId(e.target.value)}
                        >
                            <option value="">-- No Direct Link --</option>
                            {activeTickets.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} ({t.userId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50">
                            {isProcessing ? 'Uploading...' : 'Save & Share'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {showAddCamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Add Live IP Camera</h3>
                <form onSubmit={handleAddCamera} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Station</label>
                        <input required type="text" className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" placeholder="e.g. Maluri"
                            value={newCamData.stationId} onChange={e => setNewCamData({...newCamData, stationId: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Location Identifier</label>
                        <input required type="text" className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" placeholder="e.g. Platform 2 South"
                            value={newCamData.location} onChange={e => setNewCamData({...newCamData, location: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">IP Stream Link (URL)</label>
                        <input required type="url" className="w-full bg-white border rounded-lg p-2 text-gray-900 font-medium" placeholder="http://192.168.x.x/stream.m3u8"
                            value={newCamData.streamUrl} onChange={e => setNewCamData({...newCamData, streamUrl: e.target.value})} />
                        <p className="text-xs text-muted mt-1">Supports Direct Video Links, HLS, or MJPEG.</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddCamModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700">
                            Add Camera
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-2">Send Footage to User</h3>
                <p className="text-sm text-muted mb-4">Select an active ticket to attach this footage link to.</p>
                
                <div className="mb-4 max-h-60 overflow-y-auto border rounded-xl divide-y">
                    {activeTickets.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No active tickets found.</div>
                    ) : (
                        activeTickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedTicketId === ticket.id ? 'bg-brand/10 border-l-4 border-brand' : ''}`}
                            >
                                <div className="font-bold text-sm text-ink">{ticket.title}</div>
                                <div className="text-xs text-muted">User: {ticket.userId} • {ticket.type}</div>
                            </button>
                        ))
                    )}
                </div>

                <div className="flex justify-end gap-2">
                     <button onClick={() => setShowShareModal(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                     <button 
                        onClick={handleShare} 
                        disabled={!selectedTicketId || isProcessing}
                        className="px-4 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50"
                     >
                         {isProcessing ? 'Sending...' : 'Send Link'}
                     </button>
                </div>
             </div>
        </div>
      )}

    </div>
  );
}
