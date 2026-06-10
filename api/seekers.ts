import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { JobSeeker } from '../src/lib/types';
import { seekerStore, generateId } from './_store';

function validateSeekerPayload(body: unknown): { ok: true; data: Omit<JobSeeker, 'id' | 'created_at'> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  const b = body as Record<string, unknown>;

  const required = [
    'name',
    'phone',
    'industry',
    'skills',
    'experience_years',
    'location_preference',
    'expected_salary_min',
    'expected_salary_max',
    'availability',
  ];
  for (const k of required) {
    if (b[k] === undefined || b[k] === null || b[k] === '') {
      return { ok: false, error: `Missing required field: ${k}` };
    }
  }
  if (!Array.isArray(b.skills)) return { ok: false, error: 'skills must be an array' };

  const data: Omit<JobSeeker, 'id' | 'created_at'> = {
    name: String(b.name),
    phone: String(b.phone),
    wechat: b.wechat ? String(b.wechat) : undefined,
    industry: b.industry as JobSeeker['industry'],
    skills: (b.skills as unknown[]).map((s) => String(s)),
    experience_years: Number(b.experience_years),
    location_preference: b.location_preference as JobSeeker['location_preference'],
    expected_salary_min: Number(b.expected_salary_min),
    expected_salary_max: Number(b.expected_salary_max),
    availability: b.availability as JobSeeker['availability'],
    bio: b.bio ? String(b.bio) : undefined,
    source_url: b.source_url ? String(b.source_url) : '',
    source_platform: b.source_platform ? String(b.source_platform) : 'direct',
    posted_at: b.posted_at ? String(b.posted_at) : new Date().toISOString(),
  };
  return { ok: true, data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json(seekerStore);
    }

    if (req.method === 'POST') {
      const validation = validateSeekerPayload(req.body);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const seeker: JobSeeker = {
        id: generateId('seeker'),
        ...validation.data,
        created_at: new Date().toISOString(),
      };
      seekerStore.push(seeker);
      return res.status(201).json(seeker);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
