import type {
  JobSeeker,
  Employer,
  ScrapedListing,
  Location,
  Availability,
  Urgency,
} from './types';

export interface ScrapedDataset {
  scraped_at: string;
  source: string;
  total_count: number;
  listings: ScrapedListing[];
}

export interface DatasetMeta {
  scraped_at: string;
  source: string;
  total_count: number;
}

export interface AllListings {
  employers: ScrapedListing[];
  seekers: ScrapedListing[];
  meta: {
    employers: DatasetMeta | null;
    seekers: DatasetMeta | null;
  };
}

// In-memory caches keyed by promise so concurrent calls de-dupe.
let employersPromise: Promise<Employer[]> | null = null;
let seekersPromise: Promise<JobSeeker[]> | null = null;
let allListingsPromise: Promise<AllListings> | null = null;

let employersDatasetCache: ScrapedDataset | null = null;
let seekersDatasetCache: ScrapedDataset | null = null;

function dataUrl(name: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  // Normalise: ensure trailing slash, drop leading "./".
  const normalised = base.replace(/^\.\//, '/').replace(/\/?$/, '/');
  return `${normalised}data/${name}`;
}

async function fetchDataset(name: string): Promise<ScrapedDataset | null> {
  try {
    const res = await fetch(dataUrl(name), { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = (await res.json()) as ScrapedDataset;
    if (!json || !Array.isArray(json.listings)) return null;
    return json;
  } catch {
    return null;
  }
}

function listingToEmployer(listing: ScrapedListing): Employer {
  return {
    id: listing.id,
    company_name: listing.company_name ?? listing.title ?? 'Unknown',
    contact_name: listing.company_name ?? listing.title ?? '—',
    phone: listing.contact,
    industry: listing.industry,
    job_title: listing.job_title ?? listing.title ?? '',
    job_description: listing.job_description ?? listing.title ?? '',
    required_skills: listing.required_skills ?? listing.tags ?? [],
    location: (listing.location ?? 'any') as Location,
    budget_min: listing.budget_min ?? 0,
    budget_max: listing.budget_max ?? 0,
    urgency: (listing.urgency ?? 'flexible') as Urgency,
    created_at: listing.scraped_at,
    source_url: listing.source_url,
    source_platform: listing.source_platform,
    posted_at: listing.posted_at,
  };
}

function listingToSeeker(listing: ScrapedListing): JobSeeker {
  return {
    id: listing.id,
    name: listing.name ?? listing.title ?? 'Unknown',
    phone: listing.contact,
    industry: listing.industry,
    skills: listing.skills ?? listing.tags ?? [],
    experience_years: listing.experience_years ?? 0,
    location_preference: (listing.location_preference ?? 'any') as Location,
    expected_salary_min: listing.expected_salary_min ?? 0,
    expected_salary_max: listing.expected_salary_max ?? 0,
    availability: (listing.availability ?? 'oneWeek') as Availability,
    bio: listing.bio,
    created_at: listing.scraped_at,
    source_url: listing.source_url,
    source_platform: listing.source_platform,
    posted_at: listing.posted_at,
  };
}

export async function loadEmployers(): Promise<Employer[]> {
  if (!employersPromise) {
    employersPromise = (async () => {
      const dataset = await fetchDataset('employers.json');
      if (!dataset || dataset.listings.length === 0) {
        return [];
      }
      employersDatasetCache = dataset;
      const employerListings = dataset.listings.filter((l) => l.type === 'employer');
      return employerListings.map(listingToEmployer);
    })();
  }
  return employersPromise;
}

export async function loadSeekers(): Promise<JobSeeker[]> {
  if (!seekersPromise) {
    seekersPromise = (async () => {
      const dataset = await fetchDataset('seekers.json');
      if (!dataset || dataset.listings.length === 0) {
        return [];
      }
      seekersDatasetCache = dataset;
      const seekerListings = dataset.listings.filter((l) => l.type === 'seeker');
      return seekerListings.map(listingToSeeker);
    })();
  }
  return seekersPromise;
}

export async function loadAllListings(): Promise<AllListings> {
  if (!allListingsPromise) {
    allListingsPromise = (async () => {
      // Trigger normal loaders so caches are warm and consistent.
      const [empDataset, seekDataset] = await Promise.all([
        employersDatasetCache ? Promise.resolve(employersDatasetCache) : fetchDataset('employers.json'),
        seekersDatasetCache ? Promise.resolve(seekersDatasetCache) : fetchDataset('seekers.json'),
      ]);

      if (empDataset) employersDatasetCache = empDataset;
      if (seekDataset) seekersDatasetCache = seekDataset;

      const employers: ScrapedListing[] = empDataset
        ? empDataset.listings.filter((l) => l.type === 'employer')
        : [];

      const seekers: ScrapedListing[] = seekDataset
        ? seekDataset.listings.filter((l) => l.type === 'seeker')
        : [];

      return {
        employers,
        seekers,
        meta: {
          employers: empDataset
            ? {
                scraped_at: empDataset.scraped_at,
                source: empDataset.source,
                total_count: empDataset.total_count,
              }
            : null,
          seekers: seekDataset
            ? {
                scraped_at: seekDataset.scraped_at,
                source: seekDataset.source,
                total_count: seekDataset.total_count,
              }
            : null,
        },
      };
    })();
  }
  return allListingsPromise;
}

// Test helper — mainly for debugging in dev tools.
export function _resetDataLoaderCache(): void {
  employersPromise = null;
  seekersPromise = null;
  allListingsPromise = null;
  employersDatasetCache = null;
  seekersDatasetCache = null;
}
