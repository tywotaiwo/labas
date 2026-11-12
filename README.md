# LABAS Private

Invitation-only wellbeing journal for clients in the LABAS Institute 90-day executive program. Six daily ratings, a private history, and a coach desk. The app supports the coaching. It does not replace it, and it is not a medical service.

Same shape as the other projects: React Native client, Next.js website, Next.js admin, one Supabase project.

| App | Folder | Dev |
| --- | --- | --- |
| Client website | `web` | http://localhost:3000 |
| Coach desk | `admin` | http://localhost:3001 |
| iOS and Android | `mobile` | Metro, then `npm run android` or `npm run ios` |

The working order is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Run the website

```sh
cd web
npm install
npm run dev
```

Open http://localhost:3000. Create an account with email, or sign in.

## Connect Supabase

1. Create a project and run `supabase/migrations/20261109120000_initial.sql` in the SQL editor.
2. Copy `web/.env.example` to `web/.env.local` and `admin/.env.example` to `admin/.env.local`.
3. Copy `mobile/.env.example` to `mobile/.env`.
4. Put the project URL and anon key in all three. Put the service role key only in `admin/.env.local`.
5. Sign up a coach from the website login is not public. Create the auth user in Supabase, then insert an `admins` row. The roadmap has the exact SQL.
6. `cd admin && npm install && npm run dev`, sign in, and create an invitation.

Authentication → Providers: Email on. For the first pilot, confirm users yourself or turn off “Confirm email” until mail is set up.

Redirect URLs: `http://localhost:3000/invite/**` is not required for password sign-up. If you later add email confirmation, add `http://localhost:3000/**`.

## Design

Ivory background, forest text, sage actions, serif headings. The three client screens are Today, Progress, and Report.
