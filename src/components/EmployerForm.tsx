import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Industry, Location, Urgency, JobSeeker } from '../lib/types';
import { matchEmployerToSeekers } from '../lib/matching';
import { loadSeekers } from '../lib/dataLoader';
import { useAppContext } from '../context/AppContext';

const INDUSTRIES: Industry[] = ['fnb', 'cleaning', 'construction', 'retail', 'logistics', 'childcare', 'beauty', 'security', 'driver', 'other'];
const LOCATIONS: Location[] = ['central', 'north', 'south', 'east', 'west', 'any'];
const URGENCIES: Urgency[] = ['immediate', 'oneWeek', 'oneMonth', 'flexible'];

export function EmployerForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setRole, setMatchResults, setEmployerData } = useAppContext();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [wechat, setWechat] = useState('');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [location, setLocation] = useState<Location | ''>('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [seekers, setSeekers] = useState<JobSeeker[] | null>(null);

  useEffect(() => {
    let active = true;
    loadSeekers().then((data) => {
      if (active) setSeekers(data);
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
    if (!companyName.trim()) newErrors.companyName = true;
    if (!contactName.trim()) newErrors.contactName = true;
    if (!phone.trim()) newErrors.phone = true;
    if (!industry) newErrors.industry = true;
    if (!jobTitle.trim()) newErrors.jobTitle = true;
    if (!jobDescription.trim()) newErrors.jobDescription = true;
    if (!location) newErrors.location = true;
    if (!budgetMin) newErrors.budgetMin = true;
    if (!budgetMax) newErrors.budgetMax = true;
    if (!urgency) newErrors.urgency = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const employerData = {
      id: `employer-${Date.now()}`,
      company_name: companyName.trim(),
      contact_name: contactName.trim(),
      phone: phone.trim(),
      wechat: wechat.trim() || undefined,
      industry: industry as Industry,
      job_title: jobTitle.trim(),
      job_description: jobDescription.trim(),
      required_skills: skills,
      location: location as Location,
      budget_min: Number(budgetMin),
      budget_max: Number(budgetMax),
      urgency: urgency as Urgency,
      created_at: new Date().toISOString(),
      source_url: '',
      source_platform: 'direct',
      posted_at: new Date().toISOString(),
    };

    // Use matching engine with loaded seeker data (real or fallback).
    const dataset = seekers ?? [];
    const results = matchEmployerToSeekers(employerData, dataset);
    setRole('employer');
    setEmployerData(employerData);
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

  if (seekers === null) {
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
      {/* Company Name */}
      <div>
        <label className={labelClass}>{t('employer.companyName')} *</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={t('employer.companyPlaceholder')}
          className={inputClass('companyName')}
        />
        {errors.companyName && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Contact Person */}
      <div>
        <label className={labelClass}>{t('employer.contactName')} *</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={t('employer.contactPlaceholder')}
          className={inputClass('contactName')}
        />
        {errors.contactName && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>{t('employer.phone')} *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('employer.phonePlaceholder')}
          className={inputClass('phone')}
        />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* WeChat */}
      <div>
        <label className={labelClass}>
          {t('employer.wechat')} <span className="text-gray-400 text-base font-normal">({t('common.optional')})</span>
        </label>
        <input
          type="text"
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
          placeholder={t('employer.wechatPlaceholder')}
          className={inputClass('')}
        />
      </div>

      {/* Industry */}
      <div>
        <label className={labelClass}>{t('employer.industry')} *</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className={inputClass('industry')}
        >
          <option value="">{t('employer.industryPlaceholder')}</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{t(`industries.${ind}`)}</option>
          ))}
        </select>
        {errors.industry && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Job Title */}
      <div>
        <label className={labelClass}>{t('employer.jobTitle')} *</label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder={t('employer.jobTitlePlaceholder')}
          className={inputClass('jobTitle')}
        />
        {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Job Description */}
      <div>
        <label className={labelClass}>{t('employer.jobDescription')} *</label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder={t('employer.jobDescPlaceholder')}
          rows={3}
          className={inputClass('jobDescription')}
        />
        {errors.jobDescription && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Required Skills */}
      <div>
        <label className={labelClass}>{t('employer.skills')}</label>
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
          placeholder={t('employer.skillsPlaceholder')}
          className={inputClass('')}
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>{t('employer.location')} *</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value as Location)}
          className={inputClass('location')}
        >
          <option value="">{t('employer.locationPlaceholder')}</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{t(`locations.${loc}`)}</option>
          ))}
        </select>
        {errors.location && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Budget Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('employer.budgetMin')} *</label>
          <input
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="e.g. 2000"
            min={0}
            className={inputClass('budgetMin')}
          />
          {errors.budgetMin && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
        </div>
        <div>
          <label className={labelClass}>{t('employer.budgetMax')} *</label>
          <input
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="e.g. 3500"
            min={0}
            className={inputClass('budgetMax')}
          />
          {errors.budgetMax && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
        </div>
      </div>

      {/* Urgency */}
      <div>
        <label className={labelClass}>{t('employer.urgency')} *</label>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as Urgency)}
          className={inputClass('urgency')}
        >
          <option value="">--</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>{t(`urgency.${u}`)}</option>
          ))}
        </select>
        {errors.urgency && <p className="text-red-500 text-sm mt-1">{t('common.required')}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-4 text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 mt-4"
      >
        {t('employer.submit')}
      </button>
    </form>
  );
}
