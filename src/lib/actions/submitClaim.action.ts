'use server';

import { FirestoreService } from '@/lib/firebase/firestore';
import { ClaimStatus } from '@/types';
import { revalidatePath } from 'next/cache';

export async function submitClaim(itemId: string, userId: string) {
  try {
    // 1. Create Claim Record
    const claim = await FirestoreService.createClaim({
      itemId,
      userId,
      status: ClaimStatus.Submitted,
      evidence: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // 2. Retrieve Item details for the ticket
    const item = await FirestoreService.getItemById(itemId);
    
    // 3. Create Verification Ticket
    await FirestoreService.createTicket({
      userId,
      type: 'claim_verification',
      title: `Claim Request: ${item?.title || 'Unknown Item'}`,
      description: `Automated claim verification process started for Item #${itemId}`,
      relatedItemId: itemId,
      relatedClaimId: claim.id,
      status: 'open',
      adminId: 'system',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    revalidatePath('/dashboard');
    revalidatePath(`/items/${itemId}`);
    
    return { success: true, claimId: claim.id };
  } catch (error) {
    console.error('Submit Claim Error:', error);
    return { success: false, message: 'Failed to submit claim' };
  }
}