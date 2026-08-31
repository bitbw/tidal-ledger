# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js App Router application for a Neon/PostgreSQL personal ledger.

- `src/app/`: routes, page composition, API Route Handlers, and global styles.
- `src/features/ledger/`: ledger schema, server operations, recurring entries, reports, categories, and client hooks.
- `src/features/importers/`: CSV/Excel statement parsing and import logic.
- `src/lib/`: database client and Better Auth configuration/schema.
- `src/components/`: reusable UI and theme components.
- `drizzle/`: generated migrations and schema snapshots; never edit generated files casually.
- `docs/`: product and implementation documents.
- `public/`: static assets. There is currently no dedicated automated test directory.

## Build, Test, and Development Commands

```powershell
npm run dev          # Start local development on port 5001
npm run build        # Type-check and create the production build
npm start            # Run the production build locally
npm run db:generate  # Generate a Drizzle migration from schema changes
npm run db:migrate   # Apply migrations using DATABASE_URL
npm run db:studio    # Open Drizzle Studio
npm run auth:generate # Regenerate Better Auth Drizzle schema
```

Before submitting changes, run `npm run build` and `git diff --check`. No test runner is configured; manually verify affected flows against the appropriate Neon branch.

## Coding Style & Naming Conventions

Use TypeScript with strict checking, two-space indentation, double quotes, and semicolons. React components use PascalCase; hooks use `use-*.ts`; server modules use descriptive kebab-case names. Keep database access on the server, validate the authenticated user’s ledger membership, and use integer cents for monetary values. Preserve the existing visual tokens: income orange (`#ff714b`), expense teal (`#28c5b4`), and balance blue (`#5579de`).

## Testing Guidelines

There is no configured unit or integration test framework. For changes to ledger, auth, migrations, recurring entries, or reports, manually test login, create/edit flows, date boundaries, empty states, and Preview Neon data isolation. Verify migrations on the intended branch before deployment.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style messages, such as `feat: add recurring ledger entries`, `fix: ...`, or `docs: ...`. Keep commits focused. Pull requests should describe behavior changes, database/migration impact, required environment variables, verification commands, and include screenshots for UI changes. Mention any Preview/production migration steps explicitly.

## Branches & Release Workflow

- `main` is the production/main branch.
- `preview` is the preview, testing, and verification branch.
- If the user says “发布 prod” or otherwise requests a production release, first check the worktree. If there are uncommitted changes, stash them before switching branches. Switch to `main`, pull the latest remote code, merge the current development branch into `main`, and push `main`. Then return to the original development branch, restore the stashed changes if any, and push that branch.
- If the user says “发布 test”、“发布预览”、“发布测试分支” or similar, follow the same workflow targeting `preview` instead of `main`: stash uncommitted changes if needed, switch to `preview`, pull, merge the current development branch, push `preview`, then return to the original branch, restore the stash, and push it.
- If development is already happening directly on `preview` and the user only asks to push/test the preview branch, commit and push `preview` directly; do not perform a self-merge.
- Before any branch switch, inspect `git status`. Never lose uncommitted work. Use a clearly named stash and restore it after all branch operations are complete.

## Security & Configuration

Keep secrets in `.env.local` or deployment settings; never commit connection strings, auth secrets, or user data. Use the correct Neon branch URL for local, Preview, and production work. Do not bypass Better Auth session checks or expose arbitrary `bookId` values from the client.
