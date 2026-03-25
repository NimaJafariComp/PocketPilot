import type { RagAdapter } from '../interfaces/rag';

export const ragHttpMobile: RagAdapter = {
  async syncIndex() {
    throw new Error('Not wired: ragHttpMobile.syncIndex');
  },
  async ask() {
    throw new Error('Not wired: ragHttpMobile.ask');
  }
};
