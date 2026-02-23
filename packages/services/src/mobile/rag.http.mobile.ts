import type { RagAdapter } from '../interfaces/rag';

export const ragHttpMobile: RagAdapter = {
  async ask() {
    throw new Error('Not wired: ragHttpMobile.ask');
  }
};
