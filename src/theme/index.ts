import { useColorScheme } from 'react-native';

const light = {
  background: '#FBF7F2',
  card: '#FFFFFF',
  cardAlt: '#F3ECE3',
  border: '#E8DED3',
  text: '#2A211B',
  textMuted: '#6B5E54',
  accent: '#B4501E',
  onAccent: '#FFFFFF',
  accentSoft: '#F7E3D6',
  success: '#2F7D4F',
  onSuccess: '#FFFFFF',
  successSoft: '#DDF0E3',
  danger: '#B3261E',
  onDanger: '#FFFFFF',
  dangerSoft: '#F9DEDC',
  warningSoft: '#FFF1C9',
  warningText: '#6B4E00',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#15110E',
  card: '#211B17',
  cardAlt: '#2B241F',
  border: '#3A312A',
  text: '#F5EEE7',
  textMuted: '#B5A89C',
  accent: '#F08A4B',
  onAccent: '#1E120A',
  accentSoft: '#3D2618',
  success: '#6BCB8B',
  onSuccess: '#0E2416',
  successSoft: '#1F3A29',
  danger: '#F2827A',
  onDanger: '#2A0E0C',
  dangerSoft: '#432220',
  warningSoft: '#3A2F12',
  warningText: '#F3D57A',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
