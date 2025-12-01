'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Item } from '@/types/item';
import Image from 'next/image';
import Link from 'next/link';

export default function EditItemPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    mode: '',
    line: '',
    stationId: '',
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchItem();
  }, [user, authLoading, itemId]);

  const fetchItem = async () => {
    try {
      const docRef = doc(db, 'items', itemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Item;
        
        // Security Check: Ensure current user owns this item
        if (data.userId !== user?.uid) {
          alert('You do not have permission to edit this item.');
          router.push('/dashboard');
          return;
        }

        // Logic Check: Can only edit open items
        if (data.status !== 'open') {
          alert('Cannot edit an item that is resolved or closed.');
          router.push(`/items/${itemId}`);
          return;
        }

        setItem(data);
        setFormData({
          title: data.title,
          category: data.category,
          description: data.description,
          mode: data.mode,
          line: data.line,
          stationId: data.stationId,
        });
        setExistingImages(data.imageUrls || []);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (existingImages.length + newImages.length + selected.length > 3) {
        alert('Maximum 3 images allowed total.');
        return;
      }
      setNewImages(prev => [...prev, ...selected]);
    }
  };

  const removeExistingImage = (urlToRemove: string) => {
    setExistingImages(prev => prev.filter(url => url !== urlToRemove));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Upload new images
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        const uploadPromises = newImages.map(async (image) => {
          const imageRef = ref(storage, `public-items/${user.uid}/${itemId}/${Date.now()}-${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          return getDownloadURL(snapshot.ref);
        });
        uploadedUrls = await Promise.all(uploadPromises);
      }

      // Combine existing kept images with new uploads
      const finalImageUrls = [...existingImages, ...uploadedUrls];

      await updateDoc(doc(db, 'items', itemId), {
        ...formData,
        imageUrls: finalImageUrls,
        updatedAt: serverTimestamp(),
      });

      router.push('/auth/dashboard');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Item Details</h1>
        <Link href="/auth/dashboard" className="text-gray-500 hover:text-gray-700">Cancel</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Phone">Phone</option>
              <option value="Wallet">Wallet</option>
              <option value="Bag">Bag</option>
              <option value="Keys">Keys</option>
              <option value="Documents">Documents</option>
              <option value="Electronics">Electronics</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
            <input
              type="text"
              name="stationId"
              value={formData.stationId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
          />
        </div>

        {/* Image Management */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 3)</label>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {existingImages.map((url, idx) => (
              <div key={`exist-${idx}`} className="relative aspect-square">
                <Image src={url} alt="Existing" fill className="object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  X
                </button>
              </div>
            ))}
            {newImages.map((file, idx) => (
              <div key={`new-${idx}`} className="relative aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-xs text-gray-500 truncate px-2">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeNewImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  X
                </button>
              </div>
            ))}
          </div>

          {(existingImages.length + newImages.length < 3) && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#FF385C] text-white py-3 px-4 rounded-md hover:bg-[#E31C5F] disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving Changes...' : 'Update Item'}
        </button>
      </form>
    </div>
  );
}