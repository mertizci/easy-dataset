/**
 * Seed script to create initial admin user.
 * Run: node prisma/seed-auth.js
 * Or with env: DATABASE_URL=file:./dev.db node prisma/seed-auth.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin';

  const existing = await prisma.users.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('Admin user already exists:', email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.users.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'admin'
    }
  });

  console.log('Created admin user:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
