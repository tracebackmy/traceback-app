'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Item, ItemStatus } from '@/types/item' 

export default function UserReportLostItemPage() {
  const { user, loading: authLoading, isEmailVerified, uid, email } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Phone',
    description: '',
    mode: 'MRT',
    line: '',
    stationId: '',
    contactPreference: 'email' as 'email' | 'phone'
  })
  
  const [images, setImages] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (user && !isEmailVerified) router.push('/auth/verify-email');
  }, [user, authLoading, router, isEmailVerified])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid || !email) return;

    setUploading(true);
    try {
      const itemRef = doc(collection(db, 'items'));
      
      const uploadPromises = images.map(async (image) => {
          const r = ref(storage, `public-items/${uid}/${itemRef.id}/${image.name}`);
          const res = await uploadBytes(r, image);
          return getDownloadURL(res.ref);
      });
      const imageUrls = await Promise.all(uploadPromises);

      const itemData: Omit<Item, 'id'> = {
        userId: uid,
        type: 'lost',
        title: formData.title,
        category: formData.category,
        description: formData.description,
        mode: formData.mode,
        line: formData.line,
        stationId: formData.stationId,
        contactPreference: formData.contactPreference,
        status: 'reported' as ItemStatus,
        imageUrls,
        userEmail: email,
        userName: user.displayName || 'User',
        claimStatus: 'unclaimed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(itemRef, itemData);
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      setError('Failed to submit report');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || !user) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border my-8">
        <h1 className="text-2xl font-bold mb-6">Report Lost Item</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Item Title</label>
                <input type="text" required className="w-full border border-gray-300 p-2 rounded" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required className="w-full border border-gray-300 p-2 rounded" rows={3}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Station</label>
                    <input type="text" required className="w-full border border-gray-300 p-2 rounded" 
                        value={formData.stationId} onChange={e => setFormData({...formData, stationId: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Line</label>
                    <input type="text" className="w-full border border-gray-300 p-2 rounded" 
                        value={formData.line} onChange={e => setFormData({...formData, line: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Images (Max 3)</label>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
            </div>
            <button type="submit" disabled={uploading} className="w-full bg-[#FF385C] text-white p-3 rounded hover:bg-[#E31C5F] disabled:opacity-50 font-medium">
                {uploading ? 'Submitting...' : 'Submit Report'}
            </button>
        </form>
    </div>
  );
}