'use client';

import React, { useState } from 'react';
import { db } from '@/services/mockFirebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { analyzeItemDescription } from '@/services/geminiService';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TransitMode, ItemCategory, ItemStatus } from '@/types';

export default function ReportLostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ItemCategory.Other as string,
    stationId: '',
    mode: TransitMode.MRT as TransitMode,
    line: '',
  });

  const [keywords, setKeywords] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-ink mb-4">Please Sign In</h2>
        <p className="text-muted mb-8">You need to be logged in to report a lost item.</p>
        <button onClick={() => router.push('/login')} className="bg-brand text-white px-6 py-3 rounded-full font-bold shadow-soft hover:bg-brand-600 transition">
            Go to Login
        </button>
      </div>
    );
  }

  if (!user.isVerified) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-ink mb-4">Verification Required</h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
            To ensure the security of our platform, you must verify your account email before reporting lost items.
        </p>
        <Link href="/dashboard" className="inline-block bg-brand text-white px-8 py-3 rounded-full font-bold shadow-soft hover:bg-brand-600 transition">
            Go to Dashboard to Verify
        </Link>
      </div>
    );
  }

  const handleAiAnalyze = async () => {
    if (!formData.title || !formData.description) return;
    setAnalyzing(true);
    
    // Call Gemini Service
    const result = await analyzeItemDescription(formData.description, formData.title);
    
    setKeywords(result.keywords);
    // Check if suggested category exists in our Enum values
    const isValidCategory = Object.values(ItemCategory).includes(result.suggestedCategory as ItemCategory);
    
    if(isValidCategory) {
        setFormData(prev => ({ ...prev, category: result.suggestedCategory }));
    }
    setAnalyzing(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imagePreview) {
        alert("Please upload an image of the lost item (or a reference image). This helps us identify it faster.");
        return;
    }

    setLoading(true);
    try {
      const newItem = await db.createItem({
        ...formData,
        userId: user.uid,
        itemType: 'lost',
        status: ItemStatus.Reported,
        keywords: keywords,
        imageUrls: [imagePreview],
      });

      await db.createTicket({
        userId: user.uid,
        type: 'support',
        title: `Lost Report: ${formData.title}`,
        description: `Automated ticket for reported lost item. Item ID: ${newItem.id}. You can use this chat to provide more details to admins.`,
        relatedItemId: newItem.id,
        status: 'open',
      });

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-soft border border-border p-6 sm:p-8">
        <div className="mb-8 border-b border-gray-100 pb-6">
          <h1 className="text-2xl font-extrabold text-ink">Report a Lost Item</h1>
          <p className="text-muted mt-2">
             Provide as much detail as possible. A private support chat will be created automatically upon submission.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label className="block text-sm font-bold text-ink mb-2">Item Name</label>
              <input
                type="text"
                required
                className="block w-full bg-white border border-border rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition text-gray-900 font-medium"
                placeholder="e.g., Red Nike Backpack"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-sm font-bold text-ink mb-2">Description</label>
              <div className="relative">
                <textarea
                    rows={4}
                    required
                    className="block w-full bg-white border border-border rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition text-gray-900 font-medium"
                    placeholder="Describe distinguishing features, contents, brand, condition..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
                <div className="absolute bottom-3 right-3">
                     <button
                        type="button"
                        onClick={handleAiAnalyze}
                        disabled={analyzing || !formData.description}
                        className="inline-flex items-center px-3 py-1.5 border border-brand/20 rounded-lg text-xs font-bold text-brand bg-white hover:bg-brand/10 focus:outline-none transition"
                    >
                        {analyzing ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                AI Extract Keywords
                            </>
                        )}
                    </button>
                </div>
              </div>
            </div>

            {keywords.length > 0 && (
                <div className="sm:col-span-6">
                    <label className="block text-sm font-bold text-ink mb-2">Detected Keywords</label>
                    <div className="flex flex-wrap gap-2">
                        {keywords.map((k, i) => (
                            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {k}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="sm:col-span-6">
              <label className="block text-sm font-bold text-ink mb-2">
                Upload Image <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl hover:bg-gray-50 transition relative ${!imagePreview ? 'border-gray-300' : 'border-brand/30'}`}>
                {imagePreview ? (
                    <div className="relative w-full flex justify-center">
                        <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg shadow-sm" />
                        <button 
                            type="button"
                            onClick={() => setImagePreview(null)}
                            className="absolute top-2 right-2 bg-white text-gray-500 rounded-full p-2 hover:bg-red-50 hover:text-red-500 shadow-md transition"
                            title="Remove image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand hover:text-brand-600 focus-within:outline-none">
                                <span>Upload a file</span>
                                <input 
                                    id="file-upload" 
                                    name="file-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    accept="image/*" 
                                    onChange={handleImageChange}
                                    required={!imagePreview}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        <p className="text-xs text-red-500 font-medium mt-1">Required</p>
                    </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-bold text-ink mb-2">Category</label>
              <select
                className="block w-full bg-white border border-border rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition text-gray-900 font-medium"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {Object.values(ItemCategory).map((cat) => (
                   <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-bold text-ink mb-2">Transit Mode</label>
              <select
                className="block w-full bg-white border border-border rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition text-gray-900 font-medium"
                value={formData.mode}
                onChange={e => setFormData({...formData, mode: e.target.value as TransitMode})}
              >
                {Object.values(TransitMode).map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>

             <div className="sm:col-span-3">
              <label className="block text-sm font-bold text-ink mb-2">Station</label>
              <input
                type="text"
                className="block w-full bg-white border border-border rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition text-gray-900 font-medium"
                placeholder="e.g. KL Sentral"
                value={formData.stationId}
                onChange={e => setFormData({...formData, stationId: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="py-3 px-6 border border-gray-300 rounded-full shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 border border-transparent shadow-soft text-sm font-bold rounded-full text-white bg-brand hover:bg-brand-600 focus:outline-none transition disabled:opacity-70"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}