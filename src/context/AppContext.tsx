import { createContext, useContext, useState, type ReactNode } from 'react';
import type { JobSeeker, Employer } from '../lib/types';
import type { MatchResult } from '../lib/matching';

type UserRole = 'seeker' | 'employer' | null;

interface AppState {
  role: UserRole;
  setRole: (role: UserRole) => void;
  matchResults: MatchResult[];
  setMatchResults: (results: MatchResult[]) => void;
  seekerData: JobSeeker | null;
  setSeekerData: (data: JobSeeker | null) => void;
  employerData: Employer | null;
  setEmployerData: (data: Employer | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [seekerData, setSeekerData] = useState<JobSeeker | null>(null);
  const [employerData, setEmployerData] = useState<Employer | null>(null);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        matchResults,
        setMatchResults,
        seekerData,
        setSeekerData,
        employerData,
        setEmployerData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
