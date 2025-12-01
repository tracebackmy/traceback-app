'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider' // Import Toast
import Image from 'next/image'

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
  'Phone', 'Wallet', 'Bag', 'Keys', 'Documents', 
  'Electronics', 'Clothing', 'Jewelry', 'Other'
]

const modes = ['MRT', 'LRT', 'KTM', 'Monorail', 'ERL']

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { showToast } = useToast() // Use Hook
  
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

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/auth/login')
        return
    }
    if (user && !user.emailVerified) {
        router.push('/auth/verify-email')
        return
    }
  }, [user, authLoading, router])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedImages = Array.from(e.target.files)
      if (selectedImages.length + images.length > 3) {
        showToast('You can only upload up to 3 images', 'error')
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
      subject: `Lost Item Report: ${itemTitle}`,
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

    if (!user) {
      setError('You must be logged in to report an item')
      return
    }

    if (!formData.title.trim() || !formData.category || !formData.mode || !formData.stationId.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setUploading(true)

      let imageUrls: string[] = []
      if (images.length > 0) {
        const tempDocRef = doc(collection(db, 'items'))
        imageUrls = await uploadImages(user.uid, tempDocRef.id)
      }

      const itemData = {
        userId: user.uid,
        type: 'lost',
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
      await createSupportTicket(docRef.id, formData.title)

      showToast('Report submitted successfully! Check your dashboard.', 'success') // Toast
      
      setTimeout(() => {
        router.push('/profile')
      }, 2000)

    } catch (err: unknown) {
      console.error('Error reporting item:', err)
      setError('Failed to report item')
      showToast('Failed to submit report', 'error') // Toast
    } finally {
      setUploading(false)
    }
  }

  if (authLoading) return <div className="p-8 text-center">Loading...</div>
  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report a Lost Item</h1>
        <p className="text-gray-600 mt-2">
          Provide details about the item you lost. Our team will match it with our Found inventory.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              <option value="">Select a category</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              placeholder="e.g., KL Sentral"
            />
          </div>

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
              placeholder="Describe the item in detail. Include brand, color, unique features, etc."
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
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            className="px-6 py-2 bg-[#FF385C] text-white rounded-md hover:bg-[#E31C5F] disabled:opacity-50"
          >
            {uploading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  )
}