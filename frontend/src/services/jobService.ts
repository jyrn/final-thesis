// Job service for fetching and managing job data
import { type ParsedResume } from "../utils/resumeParser"
import { jobApiService, type JobFilters } from "./jobApiService"
import { Job } from "../types/Job"

export interface JobServiceJob extends Job {
  matchPercentage: number
  saved: boolean
  applied: boolean
  matchDetails?: {
    skillMatch: number
    experienceMatch: number
    locationMatch: number
    reasonsForMatch: string[]
  }
}

// Convert backend job to JobServiceJob format
const convertToJobServiceJob = (job: Job): JobServiceJob => {
  return {
    ...job,
    matchPercentage: 0, // Will be calculated based on resume
    saved: false,
    
    applied: false
  };
};

export class JobService {
  private static instance: JobService
  private jobs: JobServiceJob[] = []
  private userResume: ParsedResume | null = null

  private constructor() {}

  public static getInstance(): JobService {
    if (!JobService.instance) {
      JobService.instance = new JobService()
    }
    return JobService.instance
  }

  // Set user resume for job matching
  public setUserResume(resume: ParsedResume): void {
    this.userResume = resume
    this.updateJobMatches()
  }

  // Get jobs with ML-powered matching
  public async getRecommendedJobs(): Promise<JobServiceJob[]> {
    try {
      // Fetch jobs from backend API
      const response = await jobApiService.getJobs()
      
      // Convert to JobServiceJob format with matching
      const jobsWithMatching = response.jobs.map((job) => ({
        ...convertToJobServiceJob(job),
        matchPercentage: this.calculateMatchPercentage(job),
        postedDate: job.postedDate || new Date().toISOString(),
      }))

      this.jobs = jobsWithMatching
      return jobsWithMatching
    } catch (error) {      return []
    }
  }

  // Calculate match percentage based on resume and job requirements
  private calculateMatchPercentage(job: Omit<Job, "matchPercentage" | "saved" | "applied" | "matchDetails">): number {
    if (!this.userResume) return Math.floor(Math.random() * 40) + 30

    // Simple skill matching algorithm
    const userSkills = this.userResume.skills || []
    const jobRequirements = job.requirements || []
    
    if (jobRequirements.length === 0) return 50

    const matchingSkills = jobRequirements.filter(req => 
      userSkills.some(skill => 
        skill.toLowerCase().includes(req.toLowerCase()) || 
        req.toLowerCase().includes(skill.toLowerCase())
      )
    )

    const matchPercentage = Math.min(95, Math.max(30, (matchingSkills.length / jobRequirements.length) * 100))
    return Math.floor(matchPercentage)
  }

  // Update job matches when resume changes
  private updateJobMatches(): void {
    if (this.jobs.length > 0 && this.userResume) {
      this.jobs = this.jobs.map(job => ({
        ...job,
        matchPercentage: this.calculateMatchPercentage(job)
      }))
    }
  }

  // Format posted date to relative time
  private formatPostedDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return "1 week ago"
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  // Save/unsave job
  public toggleSaveJob(jobId: number): JobServiceJob | null {
    const job = this.jobs.find((j) => j.id === jobId)
    if (job) {
      job.saved = !job.saved
      return job
    }
    return null
  }

  // Apply to job
  public applyToJob(jobId: number): JobServiceJob | null {
    const job = this.jobs.find((j) => j.id === jobId)
    if (job) {
      job.applied = true
      return job
    }
    return null
  }

  // Get saved jobs
  public getSavedJobs(): JobServiceJob[] {
    return this.jobs.filter((job) => job.saved)
  }

  // Search and filter jobs
  public searchJobs(query: string, filters: any): JobServiceJob[] {
    let filteredJobs = [...this.jobs]

    // Text search
    if (query.trim()) {
      const searchTerm = query.toLowerCase()
      filteredJobs = filteredJobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm) ||
          job.company.toLowerCase().includes(searchTerm) ||
          job.description.toLowerCase().includes(searchTerm) ||
          job.requirements.some((req) => req.toLowerCase().includes(searchTerm)),
      )
    }

    // Apply filters
    if (filters.jobType) {
      filteredJobs = filteredJobs.filter((job) => job.type === filters.jobType)
    }
    if (filters.positionLevel) {
      filteredJobs = filteredJobs.filter((job) => job.level === filters.positionLevel)
    }
    if (filters.workplaceSetup) {
      filteredJobs = filteredJobs.filter((job) => job.workplaceType === filters.workplaceSetup)
    }
    if (filters.location) {
      filteredJobs = filteredJobs.filter((job) => job.location.toLowerCase().includes(filters.location.toLowerCase()))
    }

    // Sort by match percentage
    return filteredJobs.sort((a, b) => b.matchPercentage - a.matchPercentage)
  }

  // Get job statistics
  public getJobStats() {
    return {
      totalJobs: this.jobs.length,
      highMatches: this.jobs.filter((job) => job.matchPercentage >= 80).length,
      mediumMatches: this.jobs.filter((job) => job.matchPercentage >= 60 && job.matchPercentage < 80).length,
      appliedJobs: this.jobs.filter((job) => job.applied).length,
      savedJobs: this.jobs.filter((job) => job.saved).length,
    }
  }
}
