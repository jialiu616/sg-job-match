// In-memory fallback store for demo/development without Supabase.
// These persist only during the serverless function lifecycle.
// In production, use Supabase.
import type { JobSeeker, Employer } from '../src/lib/types';

export const seekerStore: JobSeeker[] = [];
export const employerStore: Employer[] = [];

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
