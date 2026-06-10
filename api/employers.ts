import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Employer } from '../src/lib/types';
import { employerStore, generateId } from './_store';

function validateEmployerPayload(body: unknown): { ok: true; data: Omit<Employer, 'id' | 'created_at'> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  const b = body as Record<string, unknown>;

  const required = [
    'company_name',
    'contact_name',
    'phone',
    'industry',
    'job_title',
    'job_description',
    'required_skills',
    'location',
    'budget_min',
    'budget_max',
    'urgency',
  ];
  for (const k of required) {
    if (b[k] === undefined || b[k] === null || b[k] === '') {
      return { ok: false, error: `Missing required field: ${k}` };
    }
  }
  if (!Array.isArray(b.required_skills)) {
    return { ok: false, error: 'required_skills must be an array' };
  }

  const data: Omit<Employer, 'id' | 'created_at'> = {
    company_name: String(b.company_name),
    contact_name: String(b.contact_name),
    phone: String(b.phone),
    wechat: b.wechat ? String(b.wechat) : undefined,
    industry: b.industry as Employer['industry'],
    job_title: String(b.job_title),
    job_description: String(b.job_description),
    required_skills: (b.required_skills as unknown[]).map((s) => String(s)),
    location: b.location as Employer['location'],
    budget_min: Number(b.budget_min),
    budget_max: Number(b.budget_max),
    urgency: b.urgency as Employer['urgency'],
    source_url: b.source_url ? String(b.source_url) : '',
    source_platform: b.source_platform ? String(b.source_platform) : 'direct',
    posted_at: b.posted_at ? String(b.posted_at) : new Date().toISOString(),
  };
  return { ok: true, data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json(employerStore);
    }

    if (req.method === 'POST') {
      const validation = validateEmployerPayload(req.body);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const employer: Employer = {
        id: generateId('employer'),
        ...validation.data,
        created_at: new Date().toISOString(),
      };
      employerStore.push(employer);
      return res.status(201).json(employer);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
