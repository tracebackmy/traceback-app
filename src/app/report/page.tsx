'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface FormData {
  type: 'lost' | 'found'
  title: string
  category: string
  description: string
  mode: string
  line: string
  stationId: string
  contactPreference: 'email' | 'phone'
}

const categories = [
  'Phone',
  'Wallet',
  'Bag',
  'Keys',
  'Documents',
  'Electronics',
  'Clothing',
  'Jewelry',
  'Other'
]

const modes = [
  'MRT',
  'LRT', 
  'KTM',
  'Monorail',
  'ERL'
]

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    type: 'lost',
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

    // Check if email is verified
    if (user && !user.emailVerified) {
        router.push('/auth/verify-email')
        return
    }
    }, [user, authLoading, router])

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

  const uploadImages = async (userId: string, itemId: string): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
      const imageRef = ref(storage, `public-items/${userId}/${itemId}/${image.name}-${Date.now()}`)
      const snapshot = await uploadBytes(imageRef, image)
      return getDownloadURL(snapshot.ref)
    })

    return Promise.all(uploadPromises)
  }

  const createSupportTicket = async (itemId: string, itemTitle: string) => {
    if (!user) return

    const ticketData = {
      userId: user.uid,
      userName: user.displayName || user.email || 'Unknown User',
      userEmail: user.email || 'No email',
      subject: `Support for ${formData.type} item: ${itemTitle}`,
      status: 'open' as const,
      itemId: itemId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await addDoc(collection(db, 'tickets'), ticketData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!user) {
      setError('You must be logged in to report an item')
      return
    }

    // Basic validation
    if (!formData.title.trim() || !formData.category || !formData.mode || !formData.stationId.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setUploading(true)

      // Upload images first if any
      let imageUrls: string[] = []
      if (images.length > 0) {
        // Create a temporary document to get an ID for image uploads
        const tempDocRef = doc(collection(db, 'items'))
        imageUrls = await uploadImages(user.uid, tempDocRef.id)
      }

      // Create the item document
      const itemData = {
        userId: user.uid,
        type: formData.type,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        mode: formData.mode,
        line: formData.line.trim(),
        stationId: formData.stationId.trim(),
        contactPreference: formData.contactPreference,
        status: 'open',
        imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'items'), itemData)

      // Create support ticket for this item
      await createSupportTicket(docRef.id, formData.title)

      setSuccess('Item reported successfully! A support ticket has been created.')
      
      setTimeout(() => {
        router.push('/profile')
      }, 3000)

    } catch (err: unknown) {
      console.error('Error reporting item:', err)
      if (err instanceof Error) {
        setError(err.message || 'Failed to report item')
      } else {
        setError('Failed to report item')
      }
    } finally {
      setUploading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report Lost or Found Item</h1>
        <p className="text-gray-600 mt-2">
          Help reunite people with their lost belongings. A support ticket will be automatically created.
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
          {/* Type */}
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
                <span className="ml-2 text-gray-700">Email</span>
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
                <span className="ml-2 text-gray-700">Phone</span>
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
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-[#FF385C] text-white rounded-md hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Reporting...' : 'Report Item & Create Support Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}