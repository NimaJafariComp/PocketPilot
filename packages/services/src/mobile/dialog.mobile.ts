import type { DialogAdapter } from '../interfaces/dialog';

export const dialogMobile: DialogAdapter = {
  async confirm() {
    throw new Error('Not wired: dialogMobile.confirm');
  },
  async alert() {
    throw new Error('Not wired: dialogMobile.alert');
  }
};
