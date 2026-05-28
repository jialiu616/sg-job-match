import type { VercelRequest, VercelResponse } from '@vercel/node';
import { seekerStore, employerStore } from './_store';
import { matchSeekerToEmployers, matchEmployerToSeekers } from '../src/lib/matching';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { seekerId, employerId } = req.query as { seekerId?: string; employerId?: string };

    if (seekerId) {
      const seeker = seekerStore.find((s) => s.id === seekerId);
      if (!seeker) return res.status(404).json({ error: 'Seeker not found' });
      const matches = matchSeekerToEmployers(seeker, employerStore);
      return res.status(200).json(matches);
    }

    if (employerId) {
      const employer = employerStore.find((e) => e.id === employerId);
      if (!employer) return res.status(404).json({ error: 'Employer not found' });
      const matches = matchEmployerToSeekers(employer, seekerStore);
      return res.status(200).json(matches);
    }

    return res.status(400).json({ error: 'Provide seekerId or employerId query parameter' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
