# ResearchNXT Kontakts

ResearchNXT Kontakts is a Next.js dashboard focused on prospect analytics with fast filtering, saved filter presets, and Excel exports.

## Features
- Prospect analytics table with sortable columns and pagination.
- Include/exclude filters with keyword targeting and blank-value toggles.
- Saved filters synced to Supabase per user.
- Excel export for the current prospect dataset.
- Authentication via Supabase.

## Tech Stack
- Next.js App Router, React, TypeScript
- Tailwind CSS, shadcn/ui, Radix UI, Lucide
- Supabase Auth + persisted saved filters
- Neon PostgreSQL (server actions) + xlsx exports

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Update environment variables (see below).
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

## Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

## Deployment
1. Build:
   ```bash
   npm run build
   ```
2. Start:
   ```bash
   npm run start
   ```

## License
This project is proprietary software owned by ResearchNXT.
