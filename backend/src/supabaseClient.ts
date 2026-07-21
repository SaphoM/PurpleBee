import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// This module is evaluated before index.ts's own dotenv.config() call
// (ES module imports run first), so load .env here or the vars are unset.
dotenv.config();

// Reuses the same project the frontend talks to. Only initialised when both
// vars are set — every caller guards with `if (supabase)`.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
