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

For local magic-link login, set these URLs in Supabase Auth settings:

```bash
Site URL: http://localhost:5173
Redirect URL: http://localhost:5173
```

## Database schema

The first Supabase schema is in:

```bash
supabase/schema.sql
```

Run that file in the Supabase SQL editor.

The schema creates:

- `profiles` for user profile data and roles
- `rooms` for room settings
- `bookings` for date ranges and booking status
- `booking_rooms` for connecting one booking to one or more rooms

`booking_rooms` is used because one booking can include several rooms.

After Ramadan has created an account, promote that profile to admin in the
Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'ramadan@example.com';
```

Replace the email with the real login email.
