# Build: "Sit Happens" (working title), a dog training iOS app

## What it is
An iPhone app that helps everyday dog owners train their dog with short, structured
daily sessions. Think "fitness app for dog training": pick a goal, follow a plan,
log reps, see progress. Built on positive-reinforcement methods only (no aversive
tools or techniques, ever).

## Target user
First-time or casual owners, often with a puppy or a newly adopted dog. They have
5-15 minutes a day and need to know exactly what to do next.

## MVP features (v1)
1. **Onboarding + dog profile**: name, photo, breed (optional), age, energy level,
   and 1-3 goals picked from a list (e.g. loose-leash walking, recall, sit/stay,
   crate training, potty training, jumping on people, leave it).
2. **Skill library**: ~20 skills, each with:
   - plain-language steps (3-6 per skill, broken into progressive "levels")
   - common mistakes + troubleshooting tips
   - criteria for "ready to level up" (e.g. 8/10 successes in 2 sessions)
   - Seed this as bundled JSON so content can be edited without code changes.
   - Structure only for now: the real training content will be supplied later.
3. **Daily plan**: a deterministic, rule-based generator builds today's 5-15 min
   session from the dog's goals and current levels (2-3 skills, mixing new work
   with review, prioritizing skills not practiced recently).
4. **Session mode**: big-button, one-handed UI (the other hand holds treats).
   Built-in interval timer, tap to log success/miss per rep, haptic feedback.
5. **Progress**: per-skill level, streak, a simple history chart, and notes
   per session.
6. **Reminders**: local notification at the user's chosen training time.

## Nice-to-have (v1.1, design for it but don't build yet)
- Multiple dogs per account
- Backup/sync across devices
- Short demo video clips per skill
- Android release (should mostly come free with the stack below)

## Tech constraints
- **React Native with Expo** (managed workflow, latest stable SDK), **TypeScript**
  in strict mode
- **Expo Router** for navigation
- Local persistence with **expo-sqlite** (or WatermelonDB if justified); keep a
  thin data-access layer so storage can be swapped later
- **expo-notifications** for reminders, **expo-haptics** for feedback,
  **expo-image-picker** for the dog photo
- Charts: a lightweight lib such as victory-native or react-native-gifted-charts
- State: React context + hooks, or Zustand if it stays simpler. No Redux.
- Local-first: the full MVP works offline with no backend and no account
- **No AI or ML of any kind**: no LLM calls, no AI-generated content at runtime,
  no AI-powered features. All logic is plain, deterministic code.
- iOS is the primary target; test in the iOS simulator and on device via Expo Go
  or a dev build
- Accessibility: support font scaling, accessibilityLabel on every control,
  sufficient contrast, dark mode
- Keep running costs near zero (no servers)

## Design direction
Warm, friendly, uncluttered. Rounded cards, one accent color, large tap targets.
Celebrate wins (a subtle animation on level-up) without getting gamey or noisy.

## Deliverables / how to work
1. Start with a short plan: screen list, data model, folder structure. Wait for my OK.
2. Then build in vertical slices: profile → skill library → session mode →
   daily plan → progress → reminders. Each slice should run in the iOS
   simulator before moving on.
3. Write unit tests (Jest) for the plan generator and level-up logic.
4. Leave placeholder content in the JSON schema. Do not write real training
   instructions. Define the full schema (skills, levels, steps, mistakes, tips,
   level-up criteria) and fill it with ~20 clearly marked placeholder entries
   (e.g. "PLACEHOLDER: Sit - Level 1, Step 1") so the app is fully navigable.
   Include a short CONTENT.md explaining the schema so content can be added
   by hand later.
5. Do not include medical or behavioral-health advice (aggression, severe
   anxiety). Show a "consult a certified trainer or vet behaviorist" message.

## Out of scope for v1
Subscriptions/paywall, social features, accounts/login, web, any AI features.
