import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
// We'll need to add updateUser to FirestoreService later, or access DB directly here for now
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    // In a real app, you'd verify a token here. 
    // For this phase, we trust the client request to update the DB flag.
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { 
      isVerified: true,
      updatedAt: Date.now()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}