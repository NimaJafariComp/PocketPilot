import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

// Fire-and-forget wrappers — haptics must never block or throw into UI code.
export function hapticSelect() {
  if (enabled) void Haptics.selectionAsync().catch(() => {});
}

export function hapticImpactLight() {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSuccess() {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning() {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
