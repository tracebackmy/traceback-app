'use server';

import { FirestoreService } from '@/lib/firebase/firestore';
import { ItemStatus } from '@/types';
import { revalidatePath } from 'next/cache';

// Define the shape of the form state
export type FormState = {
  success: boolean;
  message?: string;
  itemId?: string;
  error?: string;
};

export async function reportLostItem(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      stationId: formData.get('stationId') as string,
      mode: formData.get('mode') as 'MRT' | 'LRT' | 'KTM',
      userId: formData.get('userId') as string,
      // Handle the case where imageUrl might be null
      imageUrls: formData.get('imageUrl') ? [formData.get('imageUrl') as string] : [],
      keywords: (formData.get('keywords') as string)?.split(',') || []
    };

    if (!rawData.title || !rawData.description || !rawData.userId) {
      return { success: false, message: 'Missing required fields' };
    }

    const newItem = await FirestoreService.createItem({
      ...rawData,
      itemType: 'lost',
      status: ItemStatus.Reported,
      line: '', 
      keywords: rawData.keywords,
      imageUrls: rawData.imageUrls,
      aiMatchScore: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    revalidatePath('/dashboard');
    return { success: true, itemId: newItem.id };
  } catch (error) {
    console.error('Failed to report lost item:', error);
    return { success: false, message: 'Failed to create report' };
  }
}

// Fix strict type error for Partial<Item>
export async function registerFoundItem(itemData: Record<string, any>) {
  try {
    if (!itemData.title || !itemData.userId) throw new Error("Invalid data");
    
    // Explicitly cast or validate fields before sending to Firestore
    await FirestoreService.createItem({
      userId: itemData.userId,
      itemType: 'found',
      title: itemData.title,
      description: itemData.description || '',
      category: itemData.category || 'Other',
      stationId: itemData.stationId || '',
      mode: itemData.mode,
      line: itemData.line || '',
      keywords: itemData.keywords || [],
      status: ItemStatus.Listed,
      imageUrls: itemData.imageUrls || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    revalidatePath('/admin/items');
    revalidatePath('/browse');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to register found item' };
  }
}