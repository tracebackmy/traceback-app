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

const categories = [
  'Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 
  'Electronics', 'Clothing', 'Jewelry', 'Other'
];

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
    type: 'found',
    stationId: '',
    mode: '',
    line: '',
    contactPreference: 'email'
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages(prev => [...prev, ...newImages].slice(0, 3)); // Limit to 3 images
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
        status: 'open' as const,
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
          <h1 className="text-3xl font-bold text-gray-900">Add New Item</h1>
          <p className="text-gray-600 mt-2">Add a new lost or found item to the system</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form fields similar to your report page */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="lost"
                    checked={formData.type === 'lost'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C] border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">Lost Item</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="found"
                    checked={formData.type === 'found'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C] border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">Found Item</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Item Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                placeholder="e.g., Black Backpack, iPhone 13"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
                Transit Mode *
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              >
                <option value="">Select mode</option>
                {modes.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="line" className="block text-sm font-medium text-gray-700 mb-2">
                Line
              </label>
              <input
                type="text"
                id="line"
                name="line"
                value={formData.line}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                placeholder="e.g., Kajang Line"
              />
            </div>

            <div>
              <label htmlFor="stationId" className="block text-sm font-medium text-gray-700 mb-2">
                Station *
              </label>
              <input
                type="text"
                id="stationId"
                name="stationId"
                value={formData.stationId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                placeholder="e.g., KL Sentral"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
                placeholder="Describe the item in detail..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Optional, max 3)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              />
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex space-x-3 justify-end">
            <button
              type="button"
              onClick={() => router.push('/traceback-admin/items')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}