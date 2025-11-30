import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newTicket = await FirestoreService.createTicket(body);
    return NextResponse.json({ success: true, data: newTicket });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: 500 });
  }
}