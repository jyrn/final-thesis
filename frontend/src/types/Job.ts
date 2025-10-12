export interface Company {
  name: string
  description?: string
  industry?: string
  website?: string
  logo?: string
  size?: string
  founded?: number
  headquarters?: string
}

// Unified Job interface for both employer and job seeker views
export interface Job {
  // Core identifiers
  id: number | string
  _id?: string // MongoDB ID from backend
  
  // Basic job information
  title: string
  company: string
  companyDetails?: Company
  companyLogo?: string // Direct access to company profile picture
  location: string
  description: string
  
  // Salary information (unified format)
  salary?: number | string
  salaryMin?: number
  salaryMax?: number
  
  // Job classification
  type: string // Full-time, Part-time, Contract, Internship
  level: string // Entry, Mid, Senior, Director, etc.
  experienceLevel?: string
  department?: string
  
  // Work arrangement
  isRemote?: boolean
  isHybrid?: boolean
  workplaceType?: 'On-site' | 'Hybrid' | 'Remote'
  remote?: boolean // Alternative field name for compatibility
  
  // Job details
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  
  // Education requirements
  educationLevel?: string
  preferredCourse?: string
  
  // Dates and status
  postedDate: string
  lastUpdated?: string
  posted?: string // Alternative field name for compatibility
  status?: string // active, inactive, closed
  
  // Employer-specific fields
  applicants?: number
  applicantCount?: number
  views?: number
  
  // Job seeker-specific fields
  matchScore?: number
  matchingSkills?: string[]
  saved?: boolean
  applied?: boolean
  appliedDate?: string
  
  // Additional metadata
  urgency?: 'high' | 'medium' | 'low'
  matchQuality?: number
}
