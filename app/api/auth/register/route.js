import { NextResponse } from 'next/server';
import { createUser, hasAnyAdmin } from '@/lib/db/users';

/**
 * Register first admin only - when no admin exists in the system.
 * Used for initial setup.
 */
export async function POST(request) {
  try {
    const hasAdmin = await hasAnyAdmin();
    if (hasAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Registration is disabled. An admin already exists.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await createUser({
      email,
      password,
      name: name || null,
      role: 'admin'
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already registered' },
        { status: 409 }
      );
    }
    console.error('Registration failed:', error);
    return NextResponse.json(
      { error: 'Registration failed', message: error.message },
      { status: 500 }
    );
  }
}
