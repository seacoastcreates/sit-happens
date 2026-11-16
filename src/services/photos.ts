import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * Let the user pick a dog photo and copy it into the app's document directory,
 * since the picker's cache file can be purged by iOS. Returns null if cancelled.
 */
export async function pickDogPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const source = new File(result.assets[0].uri);
  const ext = source.name.includes('.') ? source.name.split('.').pop() : 'jpg';
  const destination = new File(Paths.document, `dog-${Date.now()}.${ext}`);
  await source.copy(destination);
  return destination.uri;
}

export function deletePhoto(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing or unreadable file: nothing to clean up.
  }
}
