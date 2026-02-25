import { NextResponse } from 'next/server';
import { hasAnyAdmin } from '@/lib/db/users';

export async function GET() {
  const hasAdmin = await hasAnyAdmin();
  return NextResponse.json({ registrationOpen: !hasAdmin });
}
