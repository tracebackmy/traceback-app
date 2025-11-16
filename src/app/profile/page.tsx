'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

interface UserProfile {
  uid: string
  email: string
  fullName: string
  phone: string
  createdAt: unknown
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: ''
  })
  const [saving, setSaving] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!user) return
      
      const docRef = doc(db, 'users', user.uid)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const userData = docSnap.data() as UserProfile
        setProfile(userData)
        setFormData({
          fullName: userData.fullName,
          phone: userData.phone
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

    useEffect(() => {
    if (!user) {
        router.push('/auth/login')
        return
    }
    
    // Check if email is verified
    if (user && !user.emailVerified) {
        router.push('/auth/verify-email')
        return
    }
    
    fetchUserProfile()
    }, [user, router, fetchUserProfile])

  const handleSave = async () => {
    try {
      if (!user) return
      
      setSaving(true)
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        phone: formData.phone,
        updatedAt: new Date()
      })
      setProfile(prev => prev ? { ...prev, ...formData } : null)
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: unknown) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return new Date((date as { toDate: () => Date }).toDate()).toLocaleDateString()
    }
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }
    return 'N/A'
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="bg-[#FF385C] text-white px-4 py-2 rounded-md hover:bg-[#E31C5F]"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              />
            ) : (
              <input
                type="text"
                value={profile?.fullName || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
              />
            ) : (
              <input
                type="tel"
                value={profile?.phone || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member Since
            </label>
            <input
              type="text"
              value={formatDate(profile?.createdAt)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>

        {editing && (
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/report')}
                className="w-full text-left text-blue-700 hover:text-blue-900"
              >
                Report Lost Item
              </button>
              <button
                onClick={() => router.push('/browse')}
                className="w-full text-left text-blue-700 hover:text-blue-900"
              >
                Browse Found Items
              </button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Account Status</h3>
            <p className="text-green-700">
              Email {user?.emailVerified ? 'Verified' : 'Not Verified'}
            </p>
            {!user?.emailVerified && (
              <button className="text-sm text-green-700 hover:text-green-900 mt-2">
                Resend Verification Email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}