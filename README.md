# Family Hub

Webapp for booking rooms in a shared family summer house.

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

## Supabase setup

Create a local environment file:

```bash
cp .env.example .env.local
```

Then add your Supabase values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`.env.local` is ignored by git and should not be committed.
