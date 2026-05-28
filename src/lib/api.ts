import type { JobSeeker, Employer } from './types';
import type { MatchResult } from './matching';

const API_BASE = '/api';

export async function submitSeeker(
  data: Omit<JobSeeker, 'id' | 'created_at'>
): Promise<JobSeeker> {
  const res = await fetch(`${API_BASE}/seekers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit');
  return res.json();
}

export async function submitEmployer(
  data: Omit<Employer, 'id' | 'created_at'>
): Promise<Employer> {
  const res = await fetch(`${API_BASE}/employers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit');
  return res.json();
}

export async function getMatchesForSeeker(seekerId: string): Promise<MatchResult[]> {
  const res = await fetch(`${API_BASE}/match?seekerId=${encodeURIComponent(seekerId)}`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

export async function getMatchesForEmployer(employerId: string): Promise<MatchResult[]> {
  const res = await fetch(`${API_BASE}/match?employerId=${encodeURIComponent(employerId)}`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

export async function getAllSeekers(): Promise<JobSeeker[]> {
  const res = await fetch(`${API_BASE}/seekers`);
  if (!res.ok) throw new Error('Failed to fetch seekers');
  return res.json();
}

export async function getAllEmployers(): Promise<Employer[]> {
  const res = await fetch(`${API_BASE}/employers`);
  if (!res.ok) throw new Error('Failed to fetch employers');
  return res.json();
}
