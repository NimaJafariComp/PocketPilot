import type { DialogAdapter } from '../interfaces/dialog';

export const dialogWeb: DialogAdapter = {
  async confirm(message, title) {
    return window.confirm(title ? `${title}\n\n${message}` : message);
  },
  async alert(message, title) {
    window.alert(title ? `${title}\n\n${message}` : message);
  }
};
