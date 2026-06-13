import Anthropic from '@anthropic-ai/sdk';

// Server-side only — never import from client components.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
