import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { useDog } from '@/state/DogContext';

/**
 * Load data whenever the screen gains focus, `key` changes, or training data
 * changes (DogContext version). Returns undefined until the first load finishes.
 */
export function useFocusData<T>(load: () => Promise<T>, key: unknown): T | undefined {
  const { version } = useDog();
  const [data, setData] = useState<T>();
  const [focusCount, setFocusCount] = useState(0);
  const runLoad = useEffectEvent(() => load());

  useFocusEffect(useCallback(() => setFocusCount((n) => n + 1), []));

  useEffect(() => {
    if (focusCount === 0) return;
    let active = true;
    runLoad().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [focusCount, version, key]);

  return data;
}
