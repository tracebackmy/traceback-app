import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';

export async function GET() {
  try {
    // In a real scenario, this would aggregate data from Firestore
    // For now, we mock the calculation based on getting all lists
    // Note: This is expensive in real Firestore, usually handled by increment counters
    
    const items = await FirestoreService.getItems();
    const claims = await FirestoreService.getAllClaims();

    const stats = {
      totalLost: items.filter(i => i.itemType === 'lost').length,
      totalFound: items.filter(i => i.itemType === 'found').length,
      activeClaims: claims.filter(c => c.status !== 'approved' && c.status !== 'rejected').length,
      resolvedItems: items.filter(i => i.status === 'resolved').length,
      generatedAt: Date.now()
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}