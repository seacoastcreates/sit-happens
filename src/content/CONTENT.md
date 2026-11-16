# Training content

All training content ships as bundled JSON in this folder. The app reads it at
startup; there is no server. Edit the JSON, reload the app, and the changes show up.

**Every entry is currently a PLACEHOLDER.** Before release, replace all text
containing `PLACEHOLDER:` with real, reviewed, positive-reinforcement content and
set `"placeholder": false` on each finished skill. Quick check:

```bash
grep -c PLACEHOLDER src/content/skills.json   # should be 0 before release
```

## goals.json

```jsonc
{
  "version": 1,
  "goals": [
    {
      "id": "recall",                 // stable id, never change once shipped
      "name": "Recall",               // shown in onboarding and the library
      "description": "Coming when called, every time.",
      "icon": "arrow.uturn.backward.circle.fill", // SF Symbol name
      "skillIds": ["name-response", "hand-target", "come"] // teaching order
    }
  ]
}
```

## skills.json

```jsonc
{
  "version": 1,
  "skills": [
    {
      "id": "sit",                    // stable id, stored in the user's database
      "name": "Sit",
      "summary": "One sentence shown in lists.",
      "placeholder": true,            // set false once the text is real
      "goalIds": ["foundations", "sit-stay"], // keep in sync with goals.json
      "prerequisites": [],            // skill ids that must pass level 1 first
      "minutesPerSession": 4,         // rough time for this skill in a session
      "levels": [
        {
          "level": 1,                 // 1-based, consecutive
          "title": "Short level name",
          "repsPerSession": 10,       // target reps for one session
          "steps": ["3-6 plain-language steps"],
          "mistakes": ["common mistakes"],
          "tips": ["troubleshooting tips"],
          "levelUp": {
            "minReps": 10,            // reps at this level across recent sessions
            "successRate": 0.8,       // 0-1
            "minSessions": 2          // reps must span this many sessions
          }
        }
      ]
    }
  ]
}
```

## Rules the app relies on

- Ids (`goal.id`, `skill.id`) are stored in each user's database. Renaming one
  orphans existing progress, so add new ids instead of renaming.
- `goalIds` on a skill and `skillIds` on a goal should agree.
- Levels can be added at the end of a skill safely. Removing levels may leave
  some users "mastered" on a level that no longer exists (the app clamps this).
- Level-up is checked over the most recent `minSessions` sessions that included
  this skill at this level: total reps >= `minReps` and success rate >=
  `successRate`.
- Do not add medical or behavioral-health advice (aggression, severe anxiety).
  The app shows a "consult a certified trainer or vet behaviorist" notice instead.
