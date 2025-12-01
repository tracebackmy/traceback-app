// FILE: src/app/(admin)/cctv/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
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
    const cctvData = await FirestoreService.getCCTVClips();
    const cameraData = await FirestoreService.getCameras();
    const tickets = await FirestoreService.getAllTickets();
    
    setClips(cctvData.sort((a,b) => b.timestamp - a.timestamp));
    setCameras(cameraData);
    setActiveTickets(tickets.filter(t => t.status !== 'resolved'));
    setLoading(false);
  };

  const handleDeleteClip = async (id: string) => {
      if(confirm("Are you sure you want to delete this footage record?")) {
          await FirestoreService.deleteCCTVClip(id);
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
      
      const newClip = await FirestoreService.createCCTVClip({
          ...uploadData,
          timestamp: Date.now(),
          thumbnailUrl: uploadThumbnail || 'https://via.placeholder.com/400x300?text=No+Preview',
          duration: randomDuration
      });

      if (uploadTicketId) {
          await FirestoreService.shareCCTVToTicket(uploadTicketId, newClip, 'admin_123');
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
      await FirestoreService.shareCCTVToTicket(selectedTicketId, clip, 'admin_123');
      setIsProcessing(false);
      setShowShareModal(null);
      setSelectedTicketId('');
      alert("Footage shared to ticket successfully.");
  };

  const handleAddCamera = async (e: React.FormEvent) => {
      e.preventDefault();
      await FirestoreService.addCamera(newCamData);
      setShowAddCamModal(false);
      setNewCamData({ stationId: '', location: '', streamUrl: '' });
      loadData();
      alert("Camera feed added.");
  };

  const handleDeleteCamera = async (id: string) => {
      if(confirm("Are you sure you want to remove this camera feed?")) {
          await FirestoreService.deleteCamera(id);
          loadData();
      }
  };

  return (
    // ... JSX is largely identical to previous, just ensure imports are clean ...
    // Using the same structure as your previous file, just with the updated logic above.
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ... (Header and Tabs) ... */}
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
                    Add IP Camera
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {cameras.map(cam => (
                     <div key={cam.id} className="bg-white rounded-xl shadow-soft overflow-hidden border border-border flex flex-col">
                         <div className="relative aspect-video bg-black flex items-center justify-center">
                             {/* ... Video player logic ... */}
                             {cam.status === 'online' && cam.streamUrl ? (
                                <video 
                                    src={cam.streamUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    muted 
                                    loop 
                                    playsInline
                                />
                             ) : (
                                 <div className="text-gray-500 text-xs uppercase tracking-widest font-bold">Signal Lost / Offline</div>
                             )}
                             {/* ... Live indicator ... */}
                             <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1 z-10">
                                 <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                             </div>
                         </div>
                         <div className="p-4 flex justify-between items-center bg-white flex-grow">
                             <div>
                                 <h3 className="font-bold text-ink">{cam.stationId}</h3>
                                 <p className="text-xs text-muted">{cam.location}</p>
                             </div>
                             <button onClick={() => handleDeleteCamera(cam.id)} className="text-gray-400 hover:text-red-500 transition">Delete</button>
                         </div>
                     </div>
                 ))}
                 {cameras.length === 0 && <div className="p-10 text-center text-muted col-span-3">No cameras.</div>}
              </div>
          </div>
      ) : (
          <div>
            <div className="flex justify-end mb-6">
                <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-brand text-white px-5 py-2.5 rounded-full font-bold shadow-soft hover:bg-brand-600 transition flex items-center gap-2"
                >
                    Upload Footage
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {clips.map(clip => (
                    <article key={clip.id} className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft flex flex-col group">
                        <div className="relative aspect-video bg-gray-900 group-hover:opacity-95 transition">
                            <img src={clip.thumbnailUrl} alt="CCTV" className="w-full h-full object-cover opacity-80" />
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
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                <button 
                                    onClick={() => setShowShareModal(clip.id)}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-600 rounded-lg transition"
                                >
                                    Send to Ticket
                                </button>
                                <button onClick={() => handleDeleteClip(clip.id)} className="px-3 text-gray-400 hover:text-red-500 transition">Delete</button>
                            </div>
                        </div>
                    </article>
                ))}
                {clips.length === 0 && <div className="p-10 text-center text-muted col-span-3">No archive footage.</div>}
            </div>
          </div>
      )}

      {/* Include your Modals (Upload, Add Cam, Share) exactly as in previous mock file but using state controlled above */}
      {/* ... Modals code ... */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Upload Archive Footage</h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    {/* ... form fields ... */}
                    <input required className="w-full border p-2 rounded" placeholder="Station" value={uploadData.stationId} onChange={e => setUploadData({...uploadData, stationId: e.target.value})} />
                    <input required className="w-full border p-2 rounded" placeholder="Location" value={uploadData.cameraLocation} onChange={e => setUploadData({...uploadData, cameraLocation: e.target.value})} />
                    <textarea className="w-full border p-2 rounded" placeholder="Notes" value={uploadData.notes} onChange={e => setUploadData({...uploadData, notes: e.target.value})} />
                    
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-sm font-bold mb-1 text-brand">Associate with Ticket (Optional)</label>
                        <select 
                            className="w-full bg-white border rounded-lg p-2 text-sm text-gray-900 font-medium"
                            value={uploadTicketId}
                            onChange={(e) => setUploadTicketId(e.target.value)}
                        >
                            <option value="">-- No Direct Link --</option>
                            {activeTickets.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-brand text-white font-bold rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-2">Send Footage to User</h3>
                <div className="mb-4 max-h-60 overflow-y-auto border rounded-xl divide-y">
                    {activeTickets.map(ticket => (
                        <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className={`w-full text-left p-3 hover:bg-gray-50 ${selectedTicketId === ticket.id ? 'bg-brand/10' : ''}`}>
                            <div className="font-bold text-sm text-ink">{ticket.title}</div>
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                     <button onClick={() => setShowShareModal(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                     <button onClick={handleShare} disabled={!selectedTicketId || isProcessing} className="px-4 py-2 bg-brand text-white font-bold rounded-lg">Send Link</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
}