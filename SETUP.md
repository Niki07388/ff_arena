# Free Fire Tournament Platform — Setup

## Migrations — run in this order

| # | File | What it does |
|---|---|---|
| 1 | `supabase/schema.sql` | Tables, uuid conversion, foreign keys |
| 2 | `supabase/fix_rls.sql` | Row Level Security + column privacy |
| 3 | `supabase/groups_chat.sql` | Rooms (groups), team assignment, group chat |
| 4 | `supabase/one_squad_per_event.sql` | **One squad per person, per event** |

Each ends with a verification report — every row must read **PASS**.

---

## ⚠️ Required first step: run the database migration

The app will **not** load until this is done. It currently shows
*"column teams_1.registered_by does not exist"* — that is expected until you run the SQL.

1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Click **Run**

This creates the tables, turns on Row Level Security, and installs the access rules below.

### Claim your existing data

The old `users` table (which stored publicly-readable password hashes) is dropped by the
migration, so your existing tournament temporarily has no owner.

1. Run the app, click **Sign In / Create Account**, and register with your email
2. Back in the SQL Editor, run these two statements with **your** email:

```sql
update public.tournaments
   set created_by = (select id from auth.users where email = 'you@example.com')
 where created_by is null;

update public.teams
   set registered_by = (select id from auth.users where email = 'you@example.com')
 where registered_by is null;
```

---

## Who can do what

These rules are enforced **by the database**, not just hidden in the UI — so they still hold
if someone calls the API directly with the public key.

| Action | Logged out | Logged in | Event organizer |
|---|---|---|---|
| Browse tournaments, standings, scoreboards, player stats | ✅ | ✅ | ✅ |
| See room ID / password / captain phone numbers | ❌ | ✅ | ✅ |
| Register a squad into an event | ❌ | ✅ | ✅ |
| Edit / remove a squad | ❌ | only their own | any squad in their event |
| Create a tournament | ❌ | ✅ (becomes its organizer) | ✅ |
| Enter match scores | ❌ | ❌ | ✅ own events only |
| Change scoring rules / add matches | ❌ | ❌ | ✅ own events only |
| Delete a tournament | ❌ | ❌ | ✅ own events only |

---

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Other commands:

```bash
npm run build
```

```bash
npm run lint
```

---

## Environment

Copy `.env.example` to `.env` and fill in your Supabase project values.

`.env` is git-ignored — **never commit real credentials**. The publishable key is safe to ship
in the browser bundle *only because* Row Level Security is enabled by the migration above.

---

## Email confirmation (optional)

Your project currently has **Confirm email disabled**, so accounts work the instant someone
signs up. That is the practical choice when 20+ captains register at once, because Supabase's
built-in email sender is rate-limited.

To require verified emails later: Supabase → **Authentication → Providers → Email** → enable
*Confirm email*, and configure custom SMTP under **Project Settings → Auth** so you are not
capped at a few messages per hour. The app already handles this — it shows a
"check your email" message instead of signing the user straight in.

---

## Rooms (groups) & group chat

A Free Fire custom room holds **12 squads**, so a 24-squad event needs two rooms.

**Organizer:** *Rooms & Chat* → **Create Room** → tick up to 12 squads (**Fill to 12**
grabs the next 12 unassigned) → give the room its own Room ID and password → create.
Repeat for the next 12. The database refuses a 13th squad even if the UI is bypassed,
and a squad can only ever sit in one room.

**Each room has its own private chat.** Only the organizer and captains with a squad in
that room can read or post — it is not public, and other rooms cannot see it. Messages
arrive live via Supabase Realtime. The organizer can delete any message; a captain can
delete their own.

**FF member IDs** captured at registration are listed under each squad in its room, so
you can copy them straight into the in-game invite.

## Invite links

From **Organizer Deck → Invite Link**, share:

```
https://your-site/?invite=<tournament-id>
```

Opening it selects that event and opens squad registration. If the visitor is not signed in,
they are sent to the sign-in screen first and the event stays selected.

## OBS broadcast overlay

Visit `/obs` for a clean, dark full-screen leaderboard with no app chrome — add it as a
Browser Source in OBS.
