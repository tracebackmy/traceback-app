import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'lost' | 'found' | undefined;
    const status = searchParams.get('status') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const search = searchParams.get('search') || undefined;
    
    // Pagination params
    const lastId = searchParams.get('lastId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 12;

    const result = await FirestoreService.getItems({ 
      type, 
      status, 
      userId, 
      search, 
      lastId, 
      limit 
    });
    
    return NextResponse.json({ 
      success: true, 
      data: result.items,
      pagination: {
        lastId: result.lastId,
        hasMore: !!result.lastId
      }
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newItem = await FirestoreService.createItem(body);
    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 });
  }
}