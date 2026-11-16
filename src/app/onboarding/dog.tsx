import { router } from 'expo-router';

import { DogForm } from '@/components/forms';
import { Button, Screen, T } from '@/components/ui';
import { useDraft } from '@/state/OnboardingDraft';

export default function OnboardingDog() {
  const [draft, setDraft] = useDraft();
  const valid = draft.dog.name.trim().length > 0;
  return (
    <Screen>
      <T variant="title">Who are we training?</T>
      <DogForm value={draft.dog} onChange={(dog) => setDraft((d) => ({ ...d, dog }))} />
      <Button title="Next" disabled={!valid} onPress={() => router.push('/onboarding/goals')} />
    </Screen>
  );
}
