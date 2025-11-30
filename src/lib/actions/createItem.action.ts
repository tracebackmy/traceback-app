'use server';

import { FirestoreService } from '@/lib/firebase/firestore';
import { Item, ItemStatus } from '@/types';
import { revalidatePath } from 'next/cache';

export async function reportLostItem(prevState: any, formData: FormData) {
  try {
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      stationId: formData.get('stationId') as string,
      mode: formData.get('mode') as 'MRT' | 'LRT' | 'KTM',
      userId: formData.get('userId') as string,
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
      line: '', // logic to determine line based on station could go here
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

export async function registerFoundItem(itemData: Partial<Item>) {
  try {
    if (!itemData.title || !itemData.userId) throw new Error("Invalid data");
    
    await FirestoreService.createItem({
      ...itemData as any,
      itemType: 'found',
      status: ItemStatus.Listed,
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