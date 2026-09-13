import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Pure logic only. These tests exist so the rules in lib/utils cannot be changed
// by accident — they do not touch Supabase, React, or the network.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
