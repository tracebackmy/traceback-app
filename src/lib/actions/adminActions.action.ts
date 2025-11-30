'use server';

import { FirestoreService } from '@/lib/firebase/firestore';
import { ClaimStatus, ItemStatus } from '@/types';
import { revalidatePath } from 'next/cache';

export async function approveClaimAction(claimId: string, adminId: string, itemId: string) {
  try {
    // 1. Update Claim Status
    await FirestoreService.updateClaimStatus(claimId, ClaimStatus.Approved);
    
    // 2. Update Item Status
    await FirestoreService.updateItemStatus(itemId, ItemStatus.Resolved);
    
    // Revalidate relevant paths
    revalidatePath('/admin/claims');
    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');
    revalidatePath(`/items/${itemId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Approve Claim Error:', error);
    return { success: false, message: 'Failed to approve claim' };
  }
}

export async function rejectClaimAction(claimId: string, adminId: string, reason: string) {
  try {
    await FirestoreService.updateClaimStatus(claimId, ClaimStatus.Rejected, reason);
    revalidatePath('/admin/claims');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Failed to reject claim' };
  }
}

export async function deleteItemAction(itemId: string) {
  // In a real app, we might perform a soft delete or check permissions here
  try {
    // Assuming delete method exists or we update status to closed
    await FirestoreService.updateItemStatus(itemId, ItemStatus.Closed);
    revalidatePath('/admin/items');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}