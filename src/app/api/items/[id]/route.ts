import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
import { ItemStatus } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await FirestoreService.getItemById(params.id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (body.status) {
      await FirestoreService.updateItemStatus(params.id, body.status as ItemStatus);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'No valid update fields provided' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}