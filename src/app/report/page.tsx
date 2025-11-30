'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Item, ItemStatus } from '@/types/item' 

// Categories strictly for Lost items
const categories = [
  'Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 'Electronics', 'Clothing', 'Jewelry', 'Other'
]

// Transit modes
const modes = ['MRT', 'LRT', 'KTM', 'Monorail', 'ERL']

export default function UserReportLostItemPage() {
  const { user, loading: authLoading, isEmailVerified, uid, email } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    // REMOVED: type selection. Hardcoded to 'lost' in submission.
    title: '',
    category: '',
    description: '',
    mode: '',
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

  // ... (Keep handleInputChange, handleImageChange, removeImage, uploadImages same as before) ...
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
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!user || !uid || !email) return

    if (!formData.title.trim() || !formData.category || !formData.mode || !formData.stationId.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    try {
      setUploading(true)

      const itemRef = doc(collection(db, 'items'));
      
      // Upload images
      const imageUrls = await uploadImages(itemRef.id);

      const itemData: Omit<Item, 'id'> = {
        userId: uid,
        type: 'lost', // CRITICAL: Hardcoded to 'lost'
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        mode: formData.mode,
        line: formData.line.trim(),
        stationId: formData.stationId.trim(),
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

      // REMOVED: Automatic ticket creation. 
      
      setSuccess(`Lost Item reported successfully! We will notify you if a match is found.`);
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (err: unknown) {
      console.error('Error reporting item:', err)
      setError('Failed to report item.')
    } finally {
      setUploading(false)
    }
  }

  if (authLoading || !user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report Lost Item</h1>
        <p className="text-gray-600 mt-2">
          Submit details of an item you have lost. We will automatically match it against our database.
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
          
          {/* REMOVED TYPE SELECTION RADIO BUTTONS */}
          
          {/* Contact Preference */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Contact Method *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="contactPreference"
                  value="email"
                  checked={formData.contactPreference === 'email'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C] border-gray-300"
                />
                <span className="ml-2 text-gray-700">Email ({user.email})</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="contactPreference"
                  value="phone"
                  checked={formData.contactPreference === 'phone'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C] border-gray-300"
                />
                <span className="ml-2 text-gray-700">Phone (Requires profile update)</span>
              </label>
            </div>
          </div>

          {/* Title */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., Black Backpack, iPhone 13, etc."
            />
          </div>

          {/* Category */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Mode */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              <option value="">Select mode</option>
              {modes.map(mode => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {/* Line */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., Kajang Line"
            />
          </div>

          {/* Station */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., KL Sentral"
            />
          </div>

          {/* Description */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="Describe the item in detail. Include brand, color, distinctive features, contents, etc."
            />
          </div>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images (Optional, max 3)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#FF385C] hover:text-[#E31C5F] focus-within:outline-none">
                            <span>Upload files</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
            </div>
            
            {/* Image Previews */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <div className="relative h-24 w-full">
                        <Image
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded-md"
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
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-[#FF385C] text-white rounded-md hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  )
}