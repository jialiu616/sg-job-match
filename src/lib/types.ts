export type Industry = 'fnb' | 'cleaning' | 'construction' | 'retail' | 'logistics' | 'childcare' | 'beauty' | 'security' | 'driver' | 'other';
export type Location = 'central' | 'north' | 'south' | 'east' | 'west' | 'any';
export type Availability = 'immediate' | 'oneWeek' | 'twoWeeks' | 'oneMonth';
export type Urgency = 'immediate' | 'oneWeek' | 'oneMonth' | 'flexible';

export interface JobSeeker {
  id?: string;
  name: string;
  phone: string;
  wechat?: string;
  industry: Industry;
  skills: string[];
  experience_years: number;
  location_preference: Location;
  expected_salary_min: number;
  expected_salary_max: number;
  availability: Availability;
  bio?: string;
  created_at?: string;
}

export interface Employer {
  id?: string;
  company_name: string;
  contact_name: string;
  phone: string;
  wechat?: string;
  industry: Industry;
  job_title: string;
  job_description: string;
  required_skills: string[];
  location: Location;
  budget_min: number;
  budget_max: number;
  urgency: Urgency;
  created_at?: string;
}

export interface Match {
  id?: string;
  seeker_id: string;
  employer_id: string;
  score: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  seeker?: JobSeeker;
  employer?: Employer;
}
