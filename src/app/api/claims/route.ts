import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const claims = await FirestoreService.getClaimsByUser(userId);
      return NextResponse.json({ success: true, data: claims });
    }

    const claims = await FirestoreService.getAllClaims();
    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch claims' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newClaim = await FirestoreService.createClaim(body);
    return NextResponse.json({ success: true, data: newClaim });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create claim' }, { status: 500 });
  }
}