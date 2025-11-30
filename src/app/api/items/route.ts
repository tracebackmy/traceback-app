import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'lost' | 'found' | undefined;
    const status = searchParams.get('status') || undefined;

    const items = await FirestoreService.getItems({ type, status });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // In a real implementation, you would validate the session/token here
    const newItem = await FirestoreService.createItem(body);
    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 });
  }
}