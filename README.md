# ResearchNXT Kontakts

ResearchNXT Kontakts is a Next.js dashboard for exploring accounts, centers, services, functions, and prospects with fast filtering, visual insights, and export workflows.

## Features
- Filtered summary metrics, charts, and tabbed entity views.
- Map-based exploration of center locations.
- Include/exclude filters, search, and saved presets.
- Paginated tables with detail dialogs.
- Excel export and logo lookups.

## Tech Stack
- Next.js App Router, React, TypeScript
- Tailwind CSS, shadcn/ui, Radix UI, Lucide
- Recharts, Mapbox GL, react-map-gl, xlsx
- Neon PostgreSQL, Zod, react-hook-form

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
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_LOGO_DEV_TOKEN=pk_your_logo_dev_token_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Yes | Mapbox access token |
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | No | Logo.dev token for company logos |

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
