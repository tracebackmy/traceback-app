'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';

interface NewItemForm {
  title: string;
  description: string;
  category: string;
  type: 'lost' | 'found';
  stationId: string;
  mode: string;
  line: string;
  contactPreference: 'email' | 'phone';
}

const categories = ['Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 'Electronics', 'Clothing', 'Jewelry', 'Other'];
const modes = ['MRT', 'LRT', 'KTM', 'Monorail', 'ERL'];

export default function NewItemPage() {
  const { admin } = useAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState<NewItemForm>({
    title: '',
    description: '',
    category: '',
    type: 'found', // Default to Found for Admins
    stationId: '',
    mode: '',
    line: '',
    contactPreference: 'email'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages(prev => [...prev, ...newImages].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    const uploadPromises = images.map(async (image) => {
      const imageRef = ref(storage, `admin-items/${Date.now()}-${image.name}`);
      const snapshot = await uploadBytes(imageRef, image);
      return getDownloadURL(snapshot.ref);
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    setLoading(true);
    try {
      const imageUrls = await uploadImages();

      const itemData = {
        ...formData,
        imageUrls,
        // CRITICAL: Set status to 'listed' immediately for admin found items
        status: formData.type === 'found' ? 'listed' : 'reported', 
        claimStatus: 'unclaimed' as const,
        userId: 'admin',
        userEmail: admin.email,
        userName: 'Admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'items'), itemData);
      router.push('/traceback-admin/items');
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Log Found Item</h1>
          <p className="text-gray-600 mt-2">Log an item found at the station.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Admin can technically toggle, but default is found */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" name="type" value="found" checked={formData.type === 'found'} onChange={handleInputChange} className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C]" />
                  <span className="ml-2 text-gray-700">Found Item</span>
                </label>
                {/* Admins rarely report lost, but we leave the option if a staff member loses something? 
                    Or strictly remove it if you want strict separation. Keeping for flexibility based on your "Admin can report both" implication in Phase 2, but emphasizing Found. */}
                <label className="flex items-center">
                  <input type="radio" name="type" value="lost" checked={formData.type === 'lost'} onChange={handleInputChange} className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C]" />
                  <span className="ml-2 text-gray-700">Lost Item (Staff Personal)</span>
                </label>
              </div>
            </div>

            {/* ... (Rest of the form fields same as report page, but using handleInputChange) ... */}
            {/* For brevity, assume fields for Title, Category, Station, Description, Images exist here matching the structure in ReportPage */}
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#FF385C]" />
            </div>
            {/* Add other fields... */}
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#FF385C]" />
            </div>
            
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Station *</label>
              <input type="text" name="stationId" value={formData.stationId} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#FF385C]" />
            </div>
            
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select name="category" value={formData.category} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#FF385C]">
                  <option value="">Select</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
               <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="w-full" />
             </div>
          </div>

          <div className="mt-8 flex space-x-3 justify-end">
            <button type="button" onClick={() => router.push('/traceback-admin/items')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50">{loading ? 'Creating...' : 'Create Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}