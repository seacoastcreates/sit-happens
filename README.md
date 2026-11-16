# Sit Happens (working title)

Dog training app for iPhone: short daily sessions, a rule-based daily plan, rep
logging, levels, streaks and reminders. Think "fitness app for dog training" for
first-time and casual owners with 5-15 minutes a day. Positive reinforcement only.

Expo (SDK 58) + TypeScript + Expo Router, local-first with SQLite. No backend, no
accounts, no AI or ML of any kind (by design: all logic is plain, deterministic code).

See `PROMPT.md` for the full product brief and `src/content/CONTENT.md` for the
training-content schema.

> **All training content is placeholder text.** The 20 skills and 9 goals are
> structural stand-ins marked `PLACEHOLDER:` so the app is fully navigable. Real
> content will be written by hand (or by a trainer) before release.

## Status (2026-11-16)

**v1 MVP: built, simulator-tested, not yet on a device.**

| Area | State |
| --- | --- |
| Onboarding + dog profile (name, photo, breed, age, energy, 1-3 goals) | Done |
| Skill library (20 skills / 9 goals, bundled JSON, levels, steps, mistakes, tips) | Done, placeholder text |
| Session mode (big one-handed buttons, interval timer, rep logging, haptics) | Done |
| Daily plan generator (deterministic, 5-15 min, focus / secondary / review) | Done, unit tested |
| Level-up logic + subtle level-up celebration | Done, unit tested |
| Progress (per-skill level, streak, history chart, session notes) | Done |
| Reminders (local notification at a chosen time) | Done |
| Edit dog / edit goals, settings | Done |
| Dark mode, font scaling, accessibility labels | Done |
| Trainer / vet-behaviorist disclaimer (no medical or behavioral-health advice) | Done |
| Jest tests (plan, level-up, streaks) | 30 passing |
| Real training content | Not started |
| App name, icon, splash | Not started (Expo defaults) |
| Dev build / on-device testing | Not started |
| Git | Initial commit only; MVP work is uncommitted |

## Run

```bash
npm install
npx expo start --ios     # opens in Expo Go on the iOS simulator
npm test                 # Jest: plan generator, level-up, streaks
npm run typecheck
npx expo lint
```

Local notes:

- Homebrew `watchman` is broken on this machine, so Jest runs with
  `"watchman": false` (set in `package.json`). Metro still works.
- React Compiler is on (`app.json` experiments), so lint enforces its rules: use
  `useEffectEvent`, don't read refs during render.
- Always add packages with `npx expo install` so versions match the SDK.

## Layout

```
src/app/          routes (Expo Router): onboarding, (tabs), skill/[id], session/run|summary, edit-*
src/content/      goals.json, skills.json (placeholder), types, CONTENT.md
src/db/           schema + migrations (PRAGMA user_version), repo functions
src/logic/        pure, tested: plan.ts, levelUp.ts, streak.ts, dates.ts
src/services/     training (plan cache, finishing sessions), reminders, photos
src/state/        DogContext (active dog + data version), onboarding draft
src/components/   ui primitives, shared forms
src/theme/        light/dark palette, spacing
```

## How it works

- **Daily plan** (`logic/plan.ts`): focus = lowest-level, least-recently-practiced
  unlocked goal skill; secondary = next one (prefers another goal); review = a skill
  past level 1 at a level it has passed, half reps. Session length 5-15 min from age
  and energy. Generated once per day and cached; regenerated after goal/profile
  changes or a level-up.
- **Level-up** (`logic/levelUp.ts`): each level's rule is checked over the most
  recent N sessions at that level (reps >= minReps, success >= rate), so early
  struggles don't hold a dog back once it's doing well.
- **Sessions** log every rep to SQLite immediately. Sessions left open (app killed)
  are closed at their last rep on next launch; empty ones are removed.
- **Data model**: `dog`, `dog_goal`, `skill_progress`, `session`, `rep`, `setting`.
  Every table carries `dog_id`, so multiple dogs can be added without a migration.
  Migrations are append-only.
- **Content** is bundled JSON. Edit `src/content/*.json`, reload, done. No code
  changes needed to add or rewrite skills.

## Next steps

1. **Review and commit the MVP.** Everything since the initial commit is
   uncommitted, left for review.
2. **Write real training content.** Replace every `PLACEHOLDER:` in
   `src/content/skills.json` and `goals.json` with reviewed, positive-reinforcement
   instructions and set `"placeholder": false` per skill. Release check:
   `grep -c PLACEHOLDER src/content/skills.json` must be 0 (currently 560).
   Consider having a certified trainer write or review it.
3. **Name and brand.** Final app name, icon, splash screen and accent color.
   `app.json` still has Expo's default name, icon and splash.
4. **Device testing.** Make a dev build (`eas build --profile development` or
   `npx expo run:ios`) and test on a real iPhone: haptics, notifications, photo
   picker, one-handed use outdoors with treats in the other hand.
5. **App Store prep.** Bundle identifier, privacy policy (data stays on device),
   screenshots, TestFlight.

### v1.1 (designed for, not built)

- Multiple dogs per account (schema already supports it)
- Backup / sync across devices
- Short demo video clips per skill
- Android release (should mostly come free with Expo)

### Out of scope for v1

Subscriptions / paywall, social features, accounts / login, web, any AI features.
