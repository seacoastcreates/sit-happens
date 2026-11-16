import { router } from 'expo-router';

import { GoalPicker, MAX_GOALS } from '@/components/forms';
import { Button, ProfessionalNotice, Screen, T } from '@/components/ui';
import { useDraft } from '@/state/OnboardingDraft';

export default function OnboardingGoals() {
  const [draft, setDraft] = useDraft();
  const name = draft.dog.name.trim() || 'your dog';
  return (
    <Screen>
      <T variant="title">What should {name} work on?</T>
      <T muted>
        Pick up to {MAX_GOALS}. You can change these any time. ({draft.goalIds.length}/{MAX_GOALS} selected)
      </T>
      <GoalPicker value={draft.goalIds} onChange={(goalIds) => setDraft((d) => ({ ...d, goalIds }))} />
      <ProfessionalNotice />
      <Button title="Next" disabled={draft.goalIds.length === 0} onPress={() => router.push('/onboarding/reminder')} />
    </Screen>
  );
}
