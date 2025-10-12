export type StatusType = 'info' | 'success' | 'danger' | 'warning';
export type PriorityUrgency = 'high' | 'medium' | 'low';

export interface JobPosting {
  id: number;
  title: string;
  location: string;
  type: string;
  applicants: number;
  posted: string;
  postedDate?: string;
  status: string;
  salary?: string;
  views?: number;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  urgency?: PriorityUrgency;
  matchQuality?: number;
  department: string;
  remote?: boolean;
  applicantCount?: number;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  appliedDate: string;
  status: 'pending' | 'reviewed' | 'interview' | 'hired' | 'rejected';
  resumeData?: {
    personalInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    summary?: string;
    skills?: string[];
    experience?: Array<{
      company: string;
      position: string;
      duration?: string;
      description?: string;
    }>;
  };
  profilePicture?: string;
  skills?: string[];
  education?: Array<{
    degree?: string;
    school?: string;
    major?: string;
    course?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    _id?: string;
  }>;
  jobId?: string;
  avatar?: string;
  position?: string;
  jobTitle?: string;
  matchScore?: number;
  matchPercentage?: number;
  match?: number;
  experience?: Array<{
    company: string;
    position: string;
    duration?: string;
    description?: string;
  }>;
}

export interface Employer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
  industry?: string;
  companySize?: string;
}

export interface StatItem {
  id: number;
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: string;
}
