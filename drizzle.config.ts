import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Drizzle CLI does not load Next.js `.env.local` automatically.
// Vercel provides DATABASE_URL directly in deployed environments; locally we load it here.
config({ path: '.env.local' });
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local or provide it in the shell environment.');
}

export default defineConfig({
  schema: ["./src/lib/*/schema.ts", "./src/features/*/schema.ts"],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
