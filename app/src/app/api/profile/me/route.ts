import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { loadProfile } from '@/lib/profile';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const profile = await loadProfile(session.phone);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: 'LOAD_FAILED', message: (err as Error).message },
      { status: 500 }
    );
  }
}
