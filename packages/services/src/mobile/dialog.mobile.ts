import { Alert } from 'react-native';
import type { DialogAdapter } from '../interfaces/dialog';

export const dialogMobile: DialogAdapter = {
  async confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Continue',
          onPress: () => resolve(true),
        },
      ]);
    });
  },
  async alert(message, title = 'PocketPilot') {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: 'OK',
          onPress: () => resolve(),
        },
      ]);
    });
  },
};
