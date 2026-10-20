#!/usr/bin/env node
/**
 * Inlines APP_KNOWLEDGE.md into supabase/functions/ai-chat/knowledge.ts.
 *
 * The ai-chat edge function runs in Deno on Supabase and cannot read repo
 * files at runtime, so the knowledge base is compiled into the function
 * bundle instead. Run this after every APP_KNOWLEDGE.md edit, then
 * redeploy:
 *
 *   npm run sync:knowledge && npm run deploy:assistant
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'APP_KNOWLEDGE.md');
const target = join(root, 'supabase/functions/ai-chat/knowledge.ts');

const knowledge = readFileSync(source, 'utf8');
const output = [
  '// GENERATED FILE — do not edit by hand.',
  '// Source: APP_KNOWLEDGE.md — regenerate with `npm run sync:knowledge`.',
  '// Then redeploy: `npm run deploy:assistant`.',
  '',
  `export const APP_KNOWLEDGE = ${JSON.stringify(knowledge)};`,
  '',
].join('\n');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, output);
console.log(`synced ${knowledge.length} bytes of APP_KNOWLEDGE.md → ${target}`);
