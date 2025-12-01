'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Item } from '@/types/item';
import { useToast } from '@/components/ToastProvider';
import Image from 'next/image';
import Link from 'next/link';

export default function EditItemPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
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
        
        if (data.userId !== user?.uid) {
          showToast('You do not have permission to edit this item.', 'error');
          router.push('/auth/dashboard');
          return;
        }

        if (data.status !== 'open') {
          showToast('Cannot edit an item that is resolved or closed.', 'error');
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
        router.push('/auth/dashboard');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      showToast('Error fetching item details', 'error');
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
        showToast('Maximum 3 images allowed total.', 'error');
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
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        const uploadPromises = newImages.map(async (image) => {
          const imageRef = ref(storage, `public-items/${user.uid}/${itemId}/${Date.now()}-${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          return getDownloadURL(snapshot.ref);
        });
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const finalImageUrls = [...existingImages, ...uploadedUrls];

      await updateDoc(doc(db, 'items', itemId), {
        ...formData,
        imageUrls: finalImageUrls,
        updatedAt: serverTimestamp(),
      });
      
      showToast('Item updated successfully', 'success');
      router.push('/auth/dashboard');
    } catch (error) {
      console.error('Error updating item:', error);
      showToast('Failed to update item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Item Details</h1>
        <Link href="/auth/dashboard" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
        
        <div>
          <label className="form-label">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="form-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-input"
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
            <label className="form-label">Station</label>
            <input
              type="text"
              name="stationId"
              value={formData.stationId}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            required
            className="form-input resize-none"
          />
        </div>

        {/* Image Management */}
        <div>
          <label className="form-label mb-3 block">Images (Max 3)</label>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {existingImages.map((url, idx) => (
              <div key={`exist-${idx}`} className="relative aspect-square">
                <Image src={url} alt="Existing" fill className="object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {newImages.map((file, idx) => (
              <div key={`new-${idx}`} className="relative aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center border border-gray-200 p-2">
                <span className="text-[10px] text-gray-500 truncate w-full text-center">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeNewImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {(existingImages.length + newImages.length < 3) && (
            <label className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
               <span className="text-sm font-medium text-[#FF385C]">Add Image</span>
               <input
                 type="file"
                 accept="image/*"
                 onChange={handleImageChange}
                 className="hidden"
               />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-4"
        >
          {saving ? 'Saving Changes...' : 'Update Item'}
        </button>
      </form>
    </div>
  );
}