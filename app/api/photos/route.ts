import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: { url },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error('Error saving photo:', error);
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });
  }
}
