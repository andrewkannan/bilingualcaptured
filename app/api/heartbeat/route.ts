import { NextResponse } from 'next/server';
import { activeSessions } from '@/lib/activeUsers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (sessionId) {
      activeSessions.set(sessionId, Date.now());
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false });
  }
}

export async function GET() {
  const now = Date.now();
  let count = 0;
  for (const [id, lastActive] of activeSessions.entries()) {
    // If active within the last 15 seconds, count them
    if (now - lastActive < 15000) {
      count++;
    } else {
      // Clean up dead sessions
      activeSessions.delete(id);
    }
  }
  return NextResponse.json({ count });
}
