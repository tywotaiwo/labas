# LABAS Private — roadmap

A discreet, invitation-only journal for CEOs, founders, and senior managers in a 90-day coaching program. Sixty seconds a day, the same six questions, and a picture you and the client can read together.

The differentiator is the coaching. The app makes that relationship structured and private. It should feel like a personal wellbeing journal, not a medical monitor and not a corporate dashboard.

Do the steps in order. Later steps assume the earlier ones are done.

## What version one includes

| Piece | Where it lives |
| --- | --- |
| Email account and password login | Website `/login`, mobile login |
| Coach invitation | Website `/invite` |
| Daily check-in, six symptoms, 0 to 4 | Website `/app` and the mobile app |
| Edit a past day, skip a day without penalty | Today |
| 90-day history, weekly charts, weekly and closing notes | Progress and Report |
| Save the report as PDF | Browser print on the website and the coach desk |
| Download personal data, request deletion | Account button, confirmed by the coach |
| Opt-in reminder preference | Saved on the profile. Delivery is step I |
| Coach desk: clients, completion, trends, invites, deletion | `admin` |

Every client answers the same wording for all 90 days.

| Symptom | What it captures |
| --- | --- |
| Stress | Perceived psychological stress |
| Fatigue | Mental or physical exhaustion |
| Physical tension | Muscle tension or bodily discomfort |
| Difficulty focusing | Problems concentrating |
| Irritability | Increased emotional reactivity |
| Sleep disturbance | Trouble sleeping the previous night |

Recall period on the check-in: the day from morning until now. Sleep disturbance means the previous night. Pilot the wording with the first clients before you treat the numbers as settled. These are a private checklist. They are not a validated clinical instrument. Do not describe a change as clinically meaningful unless you later switch to a validated scale.

Design: ivory `#f3f1ea`, forest `#1c332c`, sage `#8ea396`. Serif headings, plain body text, generous space, quiet charts, almost no notification chrome.

## What stays out

- AI-generated advice
- Chat, comments, or anything social
- Employer accounts or employer reports
- Apple Watch app
- Apple Health in version one

## A. Create the Supabase project

1. Create one Supabase project. Add a second later only if you want a staging copy.
2. Authentication → Providers: turn on Email.
3. For the pilot, either confirm each user yourself or turn off “Confirm email” until you have mail set up. An unconfirmed sign-up cannot accept an invitation in the same sitting.
4. Authentication → URL configuration:
   - Site URL: `http://localhost:3000` while you build, then the public website.
   - Redirect URLs: `http://localhost:3000/**` and `https://YOUR_DOMAIN/**`.

## B. Apply the database

Run `supabase/migrations/20261109120000_initial.sql` in the Supabase SQL editor.

That creates profiles, admins, enrollments, invitations, check-ins, consent records, and deletion requests. Row-level security lets a client touch only their own rows. A coach can read client progress. There is no employer role. Anonymous visitors cannot read tables. An invitation is looked up by its token through a function, not by listing the table.

## C. Make yourself a coach

1. In Supabase → Authentication → Users, add yourself with a password.
2. Run, with your email:

```sql
insert into public.admins (id, email, full_name, role)
select id, email, 'Coach', 'super_admin'
from auth.users
where email = 'you@example.com';
```

3. Copy `admin/.env.example` to `admin/.env.local`. Set the project URL, anon key, and service role key.
4. `cd admin && npm install && npm run dev`
5. Sign in at http://localhost:3001

The service role key stays on the admin server. It is used only to delete an auth user after you confirm a deletion request. Do not put it in the website or the mobile app.

## D. Run the website

1. Copy `web/.env.example` to `web/.env.local` with the same URL and anon key.
2. Set `NEXT_PUBLIC_APP_URL` to the website origin, without a trailing slash. Invitation links are built from it. Locally that is `http://localhost:3000`. Put the same value in `admin/.env.local`.
3. `cd web && npm install && npm run dev`
4. Open `/login?create=1` and create an account with email, or sign in.
5. On a phone, use Add to Home Screen. The site is the pilot client until the store builds are in people’s hands.

## E. Invite the first client

1. Admin → Invitations. Name, email, program start date.
2. Copy the private link and send it yourself. A client can also create an account with email. There is no mail provider yet.
3. The client opens the link, chooses a password, and acknowledges the privacy notice.
4. They rate today. Skipped days stay in the history and still count as acknowledged, so a skip is not a penalty.
5. You see them on Clients: day count, completion, last entry, and whether symptoms are easing or higher than the week before.

Open a client and use Save as PDF when you want a page for the session. The website report does the same for the client.

## F. Run the mobile app

React Native CLI, same generation as Nails Studio (0.84), not Expo.

1. Finish the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).
2. Copy `mobile/.env.example` to `mobile/.env` with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Changing `.env` needs a rebuild. Metro refresh does not embed new values.
4. `cd mobile && npm start`, then `npm run android` or `npm run ios`.

The phone has the same three screens, email sign-up and sign-in, past-day edits, skip, data download, and deletion request.

Bundle id: `com.tywo.labas`.

## G. Privacy before real client data

Symptom ratings are health data. Do this before a real client’s answers are stored. The in-app notice is a draft.

- Confirm the controller is LABAS Institute, and replace `privacy@labas.institute` on the privacy page.
- Agree a legal basis and the Article 9 condition for health data with counsel. The acknowledgement in the app is not automatically sufficient in every context.
- Keep the retention line honest. The draft says the program plus 12 months, or sooner when deletion is confirmed.
- Access stays coach and client. Do not add an employer login, and do not export a person’s ratings into a company report.
- Deletion removes the auth user, profile, check-ins, consents, and matching invitations. Confirm a request from Admin → Deletion, then open the client and delete.
- Store the project in the EU region if counsel wants the data kept in the EEA.

## H. Pilot the ninety days

Use the first real cohort to learn three things:

- Do they finish the check-in most days?
- Does the weekly note actually help the coaching conversation?
- Does the wording need a change before the next cohort?

If the wording changes, start a new notice version and do not rewrite history for people already mid-program. Identical questions across one person’s 90 days matter more than a prettier scale.

Fix what fails on that pass before adding anything else: sign-in, invite, today’s six ratings, a skipped day, a corrected day, Progress, Report, the coach list, and deletion.

## I. Reminders

The opt-in and the hour are already saved on the profile. Version one does not deliver the notification yet.

When the pilot shows people want it:

- Add a local daily notification in the React Native app, off until the client turns it on and the phone grants permission.
- One quiet reminder. No streaks, no guilt copy, no badge counts.
- The website can keep storing the preference. Delivery stays on the phone.

## J. Reports in the coaching session

Print-to-PDF is enough for the first sessions. If you later email a file, generate it from the same weekly note the screen already shows. Do not add a second narrative.

Still out: advice, interpretation written by a model, and any line that sounds like a diagnosis.

## K. Apple Health, only after the journal is used

Phase three, once daily tracking has proved useful.

Optional, with the client’s permission, for specific types only: sleep duration, step count, activity, resting heart rate, and heart-rate variability. The point is to set those beside the self-ratings, not to replace them.

HealthKit is read by an iOS build. A website cannot read it. Do not build an Apple Watch app for this. Keep the check-in model untouched so health samples can sit next to it later.

## Later, not scheduled

- Mail the invitation with Resend instead of copying the link.
- Per-coach visibility, if more than one coach needs a separated caseload. Today every coach row can read the program.
- A validated questionnaire, if you ever need to claim clinical change.
- Lithuanian, if a cohort needs it. The first build is English, matching the program wording above.
