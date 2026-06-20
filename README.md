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
- Production deployment
- Custom SMTP for production auth emails

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

Preview the production build locally:

```bash
npm run preview
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

## Custom SMTP for auth emails

Supabase's built-in email service is only meant for testing and has low rate
limits. Configure custom SMTP before inviting the full family.

Recommended provider: Resend.

Resend SMTP settings:

```bash
Host: smtp.resend.com
Port: 587
Username: resend
Password: your-resend-api-key
Sender name: Family Hub
Sender email: no-reply@your-verified-domain.com
```

Setup checklist:

1. Create a Resend account.
2. Add and verify a sending domain in Resend.
3. Create a Resend API key.
4. In Supabase, go to Authentication settings.
5. Open SMTP settings.
6. Enable custom SMTP.
7. Add the Resend SMTP values above.
8. Save the settings.
9. Send one test magic link from the Netlify app.
10. Check that the email arrives and redirects back to the Netlify URL.

Do not add the Resend API key to `.env.local`, Netlify, or the frontend code.
It belongs only in Supabase SMTP settings.

## Deployment with Netlify

Recommended first deployment target: Netlify.

Use these settings when importing the GitHub repository:

- Framework preset: `Vite`
- Build command: `npm run build`
- Publish directory: `dist`
- Install command: `npm install`

Add these environment variables in Netlify:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Use the same values as in `.env.local`, but add them in Netlify's site
settings instead of committing them to Git.

After the first Netlify deploy, copy the production URL, for example:

```bash
https://family-hub.netlify.app
```

Then update Supabase Auth settings:

```bash
Site URL: https://family-hub.netlify.app
Redirect URLs:
  http://localhost:5173
  https://family-hub.netlify.app
```

Keep `http://localhost:5173` as a redirect URL so local development still works.

### Netlify SPA redirects

Family Hub is a single-page app. Add this redirect rule in Netlify so refreshes
and direct links keep loading `index.html`:

```bash
/* /index.html 200
```

You can add it in Netlify under site redirects, or later as a `_redirects` file
inside `public/` if the app starts using more direct routes.

## Production checklist

Before inviting family members:

1. Run `npm run build` locally.
2. Make sure `supabase/schema.sql` has been run.
3. Make sure `supabase/role-management.sql` has been run.
4. Confirm Ramadan's profile has `role = 'admin'`.
5. Configure custom SMTP in Supabase Auth.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify.
7. Deploy from the `main` branch.
8. Add the Netlify URL to Supabase Auth settings.
9. Test magic-link login on the production URL.
10. Create one test booking.
11. Check that a member cannot see the Admin tab.

## Git notes

Do not commit local-only files:

- `.env.local`
- `AGENTS.md`
- `dist`
- `node_modules`
