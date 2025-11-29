'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Item, ItemStatus } from '@/types/item' 

interface FormData {
  title: string
  category: string
  description: string
  mode: string
  line: string
  stationId: string
  contactPreference: 'email' | 'phone'
}

const categories = [
  'Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 'Electronics', 'Clothing', 'Jewelry', 'Other'
]

const modes = ['MRT', 'LRT', 'KTM', 'Monorail', 'ERL']

export default function UserReportLostItemPage() {
  const { user, loading: authLoading, isEmailVerified, uid, email } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    description: '',
    mode: '',
    line: '',
    stationId: '',
    contactPreference: 'email'
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

    // CRITICAL: Block access if unverified
    if (user && !isEmailVerified) {
        router.push('/auth/verify-email')
        return
    }
  }, [user, authLoading, router, isEmailVerified])

  // --- Handlers remain the same ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
    // Uses the user's UID for the folder path
    const uploadPromises = images.map(async (image) => {
      const imageRef = ref(storage, `public-items/${uid}/${itemId}/${image.name}-${Date.now()}`)
      const snapshot = await uploadBytes(imageRef, image)
      return getDownloadURL(snapshot.ref)
    })

    return Promise.all(uploadPromises)
  }
  // --- Handlers end ---


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!user || !uid || !email) {
      setError('User authentication failed.')
      return
    }

    if (!formData.title.trim() || !formData.category || !formData.mode || !formData.stationId.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields (Title, Category, Mode, Station, Description).')
      return
    }

    try {
      setUploading(true)

      // 1. Create a document reference to get the ID early
      const itemRef = doc(collection(db, 'items'));
      const itemId = itemRef.id;

      // 2. Upload images using the new ID
      const imageUrls: string[] = await uploadImages(itemId);
      
      // 3. Create the final Item document (Type: 'lost', Status: 'reported')
      const itemData: Omit<Item, 'id'> = {
        userId: uid,
        type: 'lost', // CRITICAL: Users report LOST items here
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        mode: formData.mode,
        line: formData.line.trim(),
        stationId: formData.stationId.trim(),
        contactPreference: formData.contactPreference,
        status: 'reported' as ItemStatus, // CRITICAL: Set initial status
        imageUrls,
        userEmail: email,
        userName: user.displayName || 'User',
        claimStatus: 'unclaimed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Set the document data
      await setDoc(itemRef, itemData);

      // CRITICAL FIX: REMOVED AUTOMATIC SUPPORT TICKET CREATION
      // The Matching Utility (Phase 4) will create a ticket if needed.

      setSuccess(`Lost Item reported successfully! Check your dashboard for updates.`);
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (err: unknown) {
      console.error('Error reporting lost item:', err)
      setError('Failed to report item. Please check console for details.')
    } finally {
      setUploading(false)
    }
  }

  // Loading/Unauthenticated UI remains the same
  if (authLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          
          {/* CRITICAL: Hidden field enforcing 'lost' type */}
          <div className="md:col-span-2 hidden"> 
            <input type="hidden" name="type" value="lost" />
          </div>
          
          {/* Contact Preference */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Contact Method *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
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
              <label className="flex items-center">
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
              placeholder="e.g., Kajang Line, Kelana Jaya Line"
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
              placeholder="e.g., KL Sentral, Bukit Bintang"
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
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            />
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      width={100}
                      height={96}
                      className="w-full h-24 object-cover rounded-md"
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

        {/* Submit Button */}
        <div className="mt-8 flex justify-end space-x-3">
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-[#FF385C] text-white rounded-md hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Reporting...' : 'Submit Lost Item Report'}
          </button>
        </div>
      </form>
    </div>
  )
}

### Step 2: User Dashboard Page (`src/app/auth/dashboard/page.tsx`)

**File to Update:** `src/app/auth/dashboard/page.tsx`