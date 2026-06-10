import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Industry, Location, Availability, Employer } from '../lib/types';
import { matchSeekerToEmployers } from '../lib/matching';
import { loadEmployers } from '../lib/dataLoader';
import { useAppContext } from '../context/AppContext';

const INDUSTRIES: Industry[] = ['fnb', 'cleaning', 'construction', 'retail', 'logistics', 'childcare', 'beauty', 'security', 'driver', 'other'];
const LOCATIONS: Location[] = ['central', 'north', 'south', 'east', 'west', 'any'];
const AVAILABILITIES: Availability[] = ['immediate', 'oneWeek', 'twoWeeks', 'oneMonth'];
const EXPERIENCE_OPTIONS = ['0-1', '1-3', '3-5', '5-10', '10+'];

function experienceToNumber(val: string): number {
  const map: Record<string, number> = { '0-1': 0.5, '1-3': 2, '3-5': 4, '5-10': 7, '10+': 12 };
  return map[val] ?? 0;
}

export function SeekerForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setRole, setMatchResults, setSeekerData } = useAppContext();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wechat, setWechat] = useState('');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState<Location | ''>('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [availability, setAvailability] = useState<Availability | ''>('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [employers, setEmployers] = useState<Employer[] | null>(null);

  useEffect(() => {
    let active = true;
    loadEmployers().then((data) => {
      if (active) setEmployers(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!phone.trim()) newErrors.phone = true;
    if (!industry) newErrors.industry = true;
    if (!experience) newErrors.experience = true;
    if (!location) newErrors.location = true;
    if (!salaryMin) newErrors.salaryMin = true;
    if (!salaryMax) newErrors.salaryMax = true;
    if (!availability) newErrors.availability = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const seekerData = {
      id: `seeker-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      wechat: wechat.trim() || undefined,
      industry: industry as Industry,
      skills,
      experience_years: experienceToNumber(experience),
      location_preference: location as Location,
      expected_salary_min: Number(salaryMin),
      expected_salary_max: Number(salaryMax),
      availability: availability as Availability,
      bio: bio.trim() || undefined,
      created_at: new Date().toISOString(),
      source_url: '',
      source_platform: 'direct',
      posted_at: new Date().toISOString(),
    };

    // Use matching engine with loaded employer data (real or fallback).
    const dataset = employers ?? [];
    const results = matchSeekerToEmployers(seekerData, dataset);
    setRole('seeker');
    setSeekerData(seekerData);
    setMatchResults(results);
    navigate('/matches');
  };

  const inputClass = (field: string) =>
    `w-full py-3 px-4 text-lg border-2 rounded-xl outline-none transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500'
        : 'border-gray-200 bg-white focus:border-blue-500'
    }`;

  const labelClass = 'block text-lg font-medium text-gray-900 mb-1.5';

  if (employers === null) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-gray-500">
          <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-base">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className={labelClass}>{t('seeker.name')} *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('seeker.namePlaceholder')}
          className={inputClass('name')}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>{t('seeker.phone')} *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('seeker.phonePlaceholder')}
          className={inputClass('phone')}
        />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* WeChat */}
      <div>
        <label className={labelClass}>
          {t('seeker.wechat')} <span className="text-gray-400 text-base font-normal">({t('common.optional')})</span>
        </label>
        <input
          type="text"
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
          placeholder={t('seeker.wechatPlaceholder')}
          className={inputClass('')}
        />
      </div>

      {/* Industry */}
      <div>
        <label className={labelClass}>{t('seeker.industry')} *</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className={inputClass('industry')}
        >
          <option value="">{t('seeker.industryPlaceholder')}</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{t(`industries.${ind}`)}</option>
          ))}
        </select>
        {errors.industry && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Skills */}
      <div>
        <label className={labelClass}>{t('seeker.skills')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="text-blue-600 hover:text-blue-900 ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
          placeholder={t('seeker.skillsPlaceholder')}
          className={inputClass('')}
        />
      </div>

      {/* Experience */}
      <div>
        <label className={labelClass}>{t('seeker.experience')} *</label>
        <select
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className={inputClass('experience')}
        >
          <option value="">--</option>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt} {t('seeker.experienceYears')}</option>
          ))}
        </select>
        {errors.experience && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>{t('seeker.location')} *</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value as Location)}
          className={inputClass('location')}
        >
          <option value="">{t('seeker.locationPlaceholder')}</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{t(`locations.${loc}`)}</option>
          ))}
        </select>
        {errors.location && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('seeker.salaryMin')} *</label>
          <input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="e.g. 2000"
            min={0}
            className={inputClass('salaryMin')}
          />
          {errors.salaryMin && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
        </div>
        <div>
          <label className={labelClass}>{t('seeker.salaryMax')} *</label>
          <input
            type="number"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder="e.g. 3500"
            min={0}
            className={inputClass('salaryMax')}
          />
          {errors.salaryMax && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className={labelClass}>{t('seeker.availability')} *</label>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value as Availability)}
          className={inputClass('availability')}
        >
          <option value="">--</option>
          {AVAILABILITIES.map((av) => (
            <option key={av} value={av}>{t(`availability.${av}`)}</option>
          ))}
        </select>
        {errors.availability && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Bio */}
      <div>
        <label className={labelClass}>
          {t('seeker.bio')} <span className="text-gray-400 text-base font-normal">({t('common.optional')})</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('seeker.bioPlaceholder')}
          rows={3}
          className={inputClass('')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-4 text-xl font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 mt-4"
      >
        {t('seeker.submit')}
      </button>
    </form>
  );
}
