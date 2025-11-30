'use client'

import { useState, useEffect } from 'react'
import { collection, Timestamp, doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Item, ItemStatus } from '@/types/item' 

// Define constants clearly
const categories = [
  'Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 'Electronics', 'Clothing', 'Jewelry', 'Other'
]

const modes = ['MRT', 'LRT', 'KTM', 'Monorail', 'ERL']

export default function UserReportLostItemPage() {
  const { user, loading: authLoading, isEmailVerified, uid, email } = useAuth()
  const router = useRouter()
  
  // Default state hardcoded for LOST item flow
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
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/auth/login')
        return
    }
    if (user && !isEmailVerified) {
        router.push('/auth/verify-email')
        return
    }
  }, [user, authLoading, router, isEmailVerified])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedImages = Array.from(e.target.files)
      if (selectedImages.length + images.length > 3) {
        setError('You can only upload up to 3 images')
        return
      }
      setImages(prev => [...prev, ...selectedImages])
    }
  }

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const uploadImages = async (itemId: string): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
      const imageRef = ref(storage, `public-items/${uid}/${itemId}/${image.name}-${Date.now()}`)
      const snapshot = await uploadBytes(imageRef, image)
      return getDownloadURL(snapshot.ref)
    })
    return Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid || !email) return;

    setUploading(true);
    try {
      // Generate ID first
      const itemRef = doc(collection(db, 'items'));
      
      // Upload images with that ID
      const imageUrls = await uploadImages(itemRef.id);

      const itemData: Omit<Item, 'id'> = {
        userId: uid,
        type: 'lost', // CRITICAL: Hardcoded to 'lost'
        title: formData.title,
        category: formData.category,
        description: formData.description,
        mode: formData.mode,
        line: formData.line,
        stationId: formData.stationId,
        contactPreference: formData.contactPreference,
        status: 'reported' as ItemStatus, // CRITICAL: Initial status
        imageUrls,
        userEmail: email,
        userName: user.displayName || 'User',
        claimStatus: 'unclaimed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(itemRef, itemData);
      
      setSuccess(`Lost Item reported successfully! Check your dashboard for updates.`);
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (e) {
      console.error(e);
      setError('Failed to submit report');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report Lost Item</h1>
        <p className="text-gray-600 mt-2">
          Submit details of an item you have lost. We will notify you if a match is found.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Item Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., Blue Wallet"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Contact Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Method *</label>
             <select 
                name="contactPreference"
                value={formData.contactPreference} 
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
            </select>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transit Mode *</label>
            <select
              name="mode"
              value={formData.mode}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              {modes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Station *</label>
            <input
              type="text"
              name="stationId"
              value={formData.stationId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., KL Sentral"
            />
          </div>
          
           {/* Line */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Line (Optional)</label>
            <input
              type="text"
              name="line"
              value={formData.line}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., Kelana Jaya Line"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
              placeholder="Describe the item in detail (color, brand, unique marks)..."
            />
          </div>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 3)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <div className="relative h-24 w-full">
                         <Image
                            src={URL.createObjectURL(image)}
                            alt="preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 font-medium transition-colors"
          >
            {uploading ? 'Reporting...' : 'Report Item'}
          </button>
        </div>
      </form>
    </div>
  )
}