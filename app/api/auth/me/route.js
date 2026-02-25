import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/apiGuard';
import { getUserById } from '@/lib/db/users';

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get current user failed:', error);
    return NextResponse.json(
      { error: 'Failed to get user', message: error.message },
      { status: 500 }
    );
  }
}
