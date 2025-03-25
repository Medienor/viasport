import { NextResponse } from 'next/server';
import { updateAllTeamsData } from '@/scripts/teamDataFetcher';

export const runtime = 'edge';

export async function GET(request: Request) {
  // Verify the request is from your cron job
  const authHeader = request.headers.get('x-cron-secret');
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await updateAllTeamsData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Failed to update team data' }, { status: 500 });
  }
} 