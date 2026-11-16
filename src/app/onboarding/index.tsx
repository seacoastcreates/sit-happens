import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Icon, Screen, T } from '@/components/ui';
import { space, useColors } from '@/theme';

export default function Welcome() {
  const c = useColors();
  return (
    <Screen scroll={false} padTop contentStyle={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.xl }}>
        <View
          style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pawprint.fill" size={64} color={c.accent} />
        </View>
        <T variant="display" style={{ textAlign: 'center' }}>
          Sit Happens
        </T>
        <T muted style={{ textAlign: 'center', maxWidth: 320 }}>
          Short, friendly training sessions for you and your dog. Pick a goal, follow today&apos;s plan, and watch the
          progress add up.
        </T>
      </View>
      <View style={{ gap: space.md }}>
        <T variant="caption" muted style={{ textAlign: 'center' }}>
          Positive reinforcement only. Everything stays on this phone.
        </T>
        <Button title="Get started" onPress={() => router.push('/onboarding/dog')} />
      </View>
    </Screen>
  );
}
