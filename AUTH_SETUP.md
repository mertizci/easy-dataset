# User Authentication Setup

## Initial Setup

1. **Apply database schema** (adds Users and ProjectUserAccess tables):
   ```bash
   pnpm db:push
   # or: npm run db:push
   ```

2. **Create first admin** (choose one):
   - **Option A**: Visit `/register` in browser - create admin account (only works when no admin exists)
   - **Option B**: Run seed script:
     ```bash
     ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword pnpm db:seed-auth
     ```

3. **Login** at `/login` with your admin credentials.

## User Roles

- **Admin**: Full access to all projects. Can create projects, manage users, configure models, etc.
- **Reviewer**: Can only access projects they are assigned to. Their only permission is to rate questions and answers (score 0-5).

## Adding Reviewers to a Project

1. Login as admin.
2. Open a project → Settings → User Access tab.
3. Add user by email. If the user does not exist, provide a password to create them.
4. The reviewer can now login and will see only the projects they are assigned to.

## Environment Variables

- `JWT_SECRET`: Optional. Set in production for secure JWT signing. Defaults to a development secret.
- `DATABASE_URL`: Required for Prisma (e.g. `file:./dev.db` for SQLite).
