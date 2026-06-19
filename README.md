# Family Hub

Webapp for booking rooms in a shared family summer house.

## MVP status

Implemented:

- Magic-link login with Supabase Auth
- Shared booking calendar with month view
- Room availability per selected date
- Create, edit, and cancel bookings
- Double-booking protection in Supabase
- Admin room management
- Admin user and role management
- In-app booking confirmation

Not implemented yet:

- Real email confirmation after booking
- Booking approval workflow
- Waiting list
- Notifications before visits
- Deployment setup

## Local development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your Supabase values to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`.env.local` is ignored by git and must not be committed.

Start the dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

## Supabase setup checklist

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/role-management.sql`.
5. In Supabase Auth settings, set local URLs:

```bash
Site URL: http://localhost:5173
Redirect URL: http://localhost:5173
```

6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
7. Start the app with `npm run dev`.
8. Log in once with Ramadan's email.
9. Promote Ramadan to admin in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'ramadan@example.com';
```

Replace `ramadan@example.com` with the real login email.

## Database files

Run these files in order:

1. `supabase/schema.sql`
2. `supabase/role-management.sql`

`schema.sql` creates:

- `profiles` for user profile data and roles
- `rooms` for room settings
- `bookings` for date ranges and booking status
- `booking_rooms` for connecting one booking to one or more rooms

`booking_rooms` is used because one booking can include several rooms.

`role-management.sql` removes self-service profile updates so members cannot
change their own role directly through the API.

## Admin roles

The app has two roles:

- `admin`: can manage rooms, bookings, users, and roles
- `member`: can create bookings and manage their own bookings

Ramadan should be the first admin. After that, admin users can manage roles from
the Admin view in the app.

## Git notes

Do not commit local-only files:

- `.env.local`
- `AGENTS.md`
- `dist`
- `node_modules`
