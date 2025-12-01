'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
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
  const { showToast } = useToast()
  
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

      showToast('Report submitted successfully! Check your dashboard.', 'success')
      
      setTimeout(() => {
        router.push('/auth/dashboard')
      }, 2000)

    } catch (err: unknown) {
      console.error('Error reporting item:', err)
      setError('Failed to report item')
      showToast('Failed to submit report', 'error')
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="form-label">
              Item Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="e.g., Black Backpack, iPhone 13"
            />
          </div>

          <div>
            <label htmlFor="category" className="form-label">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="form-input"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mode" className="form-label">
              Transit Mode *
            </label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleInputChange}
              required
              className="form-input"
            >
              <option value="">Select mode</option>
              {modes.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="line" className="form-label">
              Line
            </label>
            <input
              type="text"
              id="line"
              name="line"
              value={formData.line}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g., Kajang Line"
            />
          </div>

          <div>
            <label htmlFor="stationId" className="form-label">
              Station *
            </label>
            <input
              type="text"
              id="stationId"
              name="stationId"
              value={formData.stationId}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="e.g., KL Sentral"
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">
              Preferred Contact Method *
            </label>
            <div className="flex space-x-6 mt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="contactPreference"
                  value="email"
                  checked={formData.contactPreference === 'email'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#FF385C] focus:ring-[#FF385C] border-gray-300"
                />
                <span className="ml-2 text-gray-700 font-medium">Email</span>
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
                <span className="ml-2 text-gray-700 font-medium">Phone</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="form-label">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              required
              className="form-input resize-none"
              placeholder="Describe the item in detail. Include brand, color, distinctive features, contents, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">
              Images (Optional, max 3)
            </label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors bg-gray-50">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#FF385C] hover:text-[#E31C5F] focus-within:outline-none">
                    <span>Upload files</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
            
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square group">
                    <Image
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-3 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 font-medium shadow-sm transition-colors"
          >
            {uploading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  )
}