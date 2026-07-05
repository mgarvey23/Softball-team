# ⚾ Softball Team Hub

A simple web hub for a recreational men's softball team. One place to:

- **🧢 Roster / sign-up** — players add themselves with jersey #, contact info,
  which hand they bat/throw, and the positions they can play.
- **📅 Schedule** — anyone proposes a practice or game time; everyone marks
  **In / Maybe / Out** so you can see the best time at a glance.
- **💬 Forum** — start topics and reply, so discussions stay organized by subject.
- **💡 Ideas** — drop quick suggestions and upvote the best ones.
- **⚾ Lineups** — the "ups" set the batting order and assign field positions,
  and can save a separate lineup for each game.

No passwords: each person picks (or creates) their player on first visit, and
the device remembers who they are. Their posts, votes, and availability all stay
tied to them, marked with a **You** badge — like a lightweight account.

## How the data is stored

The app runs in one of two modes automatically:

| Mode | When | Data |
| --- | --- | --- |
| **Local** | No Firebase config present | Stored in that browser only. Great for trying it out. |
| **Live (shared)** | Firebase config present | One shared database the whole team reads and writes in real time, from any phone. |

In **Live** mode there's still no login screen — each device signs in to Firebase
_anonymously_ behind the scenes, which is all the security rules need to let the
team collaborate on the same data.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints. With no `.env` it runs in local mode.

## Turn on shared (Firebase) mode

1. Create a project at <https://console.firebase.google.com>.
2. Add a **Web app** and copy its config values.
3. Enable **Authentication → Sign-in method → Anonymous**.
4. Create a **Firestore database** and paste the rules from
   [`firestore.rules`](./firestore.rules) into Firestore → Rules.
5. Copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*` values, then
   restart the dev server. (Optionally set `VITE_TEAM_ID` to run more than one
   team from the same project; it defaults to `main`.)

## Deploy (GitHub Pages)

Pushing to `main` builds the site and deploys it to GitHub Pages via
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). For shared
mode on the live site, add the same `VITE_FIREBASE_*` values (and optional
`VITE_TEAM_ID`) as **repository secrets** so they're injected at build time, and
add your Pages domain to Firebase Auth → Settings → **Authorized domains**.

## Tech

React + TypeScript + Vite. Data lives in a single object (`TeamState`) that's
persisted either to `localStorage` or to one Firestore document, so the UI is
identical in both modes. All mutations are pure functions in
[`src/teamOps.ts`](./src/teamOps.ts).

## Roadmap ideas

- Season stats (per-player batting, attendance).
- Drag-and-drop batting order.
- Email/SMS reminders for upcoming games.
- Per-member "my stuff" summary view.
