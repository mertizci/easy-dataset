import { NextResponse } from 'next/server';
import { getProjectUsers } from '@/lib/db/project-user-access';
import { addProjectUserAccess } from '@/lib/db/project-user-access';
import { getUserByEmail, createUser } from '@/lib/db/users';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;

    const users = await getProjectUsers(params.projectId);
    return NextResponse.json(
      users.map((u) => ({
        id: u.user.id,
        email: u.user.email,
        name: u.user.name,
        role: u.role
      }))
    );
  } catch (error) {
    console.error('Get project users failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;

    const body = await request.json();
    const { email, password, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let user = await getUserByEmail(email);
    if (!user) {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'User does not exist. Provide password to create new user.' },
          { status: 400 }
        );
      }
      user = await createUser({
        email,
        password,
        name: name || null,
        role: 'reviewer'
      });
    }

    await addProjectUserAccess(params.projectId, user.id, 'reviewer');
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: 'reviewer' }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'User already has access to this project' }, { status: 409 });
    }
    console.error('Add project user failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
