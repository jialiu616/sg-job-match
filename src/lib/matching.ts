import type { JobSeeker, Employer, Availability, Urgency } from './types';

export interface MatchResult {
  seekerId: string;
  employerId: string;
  score: number; // 0-100
  breakdown: {
    industry: number; // max 30
    skills: number; // max 30
    salary: number; // max 20
    location: number; // max 10
    availability: number; // max 10
  };
}

const AVAILABILITY_DAYS: Record<Availability, number> = {
  immediate: 0,
  oneWeek: 7,
  twoWeeks: 14,
  oneMonth: 30,
};

const URGENCY_DAYS: Record<Urgency, number> = {
  immediate: 0,
  oneWeek: 7,
  oneMonth: 30,
  flexible: 60,
};

function scoreIndustry(seeker: JobSeeker, employer: Employer): number {
  return seeker.industry === employer.industry ? 30 : 0;
}

function scoreSkills(seeker: JobSeeker, employer: Employer): number {
  const seekerSkills = (seeker.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const employerSkills = (employer.required_skills || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (seekerSkills.length === 0 && employerSkills.length === 0) {
    return 15;
  }

  const seekerSet = new Set(seekerSkills);
  let overlap = 0;
  for (const skill of employerSkills) {
    if (seekerSet.has(skill)) overlap += 1;
  }

  const denom = Math.max(seekerSkills.length, employerSkills.length);
  if (denom === 0) return 15;

  return Math.round((overlap / denom) * 30);
}

function scoreSalary(seeker: JobSeeker, employer: Employer): number {
  const sMin = seeker.expected_salary_min;
  const sMax = seeker.expected_salary_max;
  const eMin = employer.budget_min;
  const eMax = employer.budget_max;

  // Direct overlap
  const overlaps = sMin <= eMax && eMin <= sMax;
  if (overlaps) return 20;

  // Partial overlap: gap within 20% of either side
  const gap =
    sMin > eMax
      ? sMin - eMax // seeker wants more than employer offers
      : eMin - sMax; // employer offers more than seeker expects (still consider partial)

  const seekerMid = (sMin + sMax) / 2 || 1;
  const employerMid = (eMin + eMax) / 2 || 1;
  const tolerance = Math.min(seekerMid, employerMid) * 0.2;

  if (gap > 0 && gap <= tolerance) return 10;
  return 0;
}

function scoreLocation(seeker: JobSeeker, employer: Employer): number {
  if (seeker.location_preference === 'any' || employer.location === 'any') return 10;
  return seeker.location_preference === employer.location ? 10 : 0;
}

function scoreAvailability(seeker: JobSeeker, employer: Employer): number {
  const seekerDays = AVAILABILITY_DAYS[seeker.availability];
  const urgency = employer.urgency;

  // Flexible urgency means anything works
  if (urgency === 'flexible') return 10;

  const employerDays = URGENCY_DAYS[urgency];

  if (seekerDays <= employerDays) return 10;
  if (seekerDays - employerDays <= 7) return 5;
  return 0;
}

function scorePair(seeker: JobSeeker, employer: Employer): MatchResult {
  const breakdown = {
    industry: scoreIndustry(seeker, employer),
    skills: scoreSkills(seeker, employer),
    salary: scoreSalary(seeker, employer),
    location: scoreLocation(seeker, employer),
    availability: scoreAvailability(seeker, employer),
  };

  const score =
    breakdown.industry +
    breakdown.skills +
    breakdown.salary +
    breakdown.location +
    breakdown.availability;

  return {
    seekerId: seeker.id ?? '',
    employerId: employer.id ?? '',
    score,
    breakdown,
  };
}

export function matchSeekerToEmployers(seeker: JobSeeker, employers: Employer[]): MatchResult[] {
  const results = employers.map((e) => scorePair(seeker, e));
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

export function matchEmployerToSeekers(employer: Employer, seekers: JobSeeker[]): MatchResult[] {
  const results = seekers.map((s) => scorePair(s, employer));
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}
