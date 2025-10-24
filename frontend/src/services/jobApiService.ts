import { apiService } from './apiService';
import { Job } from '../types/Job';

export interface JobFilters {
  search?: string;
  location?: string;
  type?: string;
  level?: string;
  workplaceType?: string;
  department?: string;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  limit?: number;
}

export interface JobPostingData {
  title: string;
  description: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  type: string;
  level: string;
  department: string;
  workplaceType?: string;
  remote?: boolean;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  educationLevel?: string;
  preferredCourse?: string;
  status?: string;
  maxApplications?: number;
}

export interface JobsResponse {
  jobs: Job[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EmployerJobsResponse {
  jobs: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class JobApiService {
  // Job Seeker Methods
  async getJobs(filters?: JobFilters): Promise<JobsResponse> {
    try {
      const response = await apiService.getJobs(filters);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch jobs');
      }

      // Backend returns { success: true, data: { jobs: [...], pagination: {...} } }
      // We need to return the data object which contains jobs and pagination
      return response.data;
    } catch (error) {      throw error;
    }
  }

  async getJobById(id: string): Promise<Job> {
    try {
      const response = await apiService.getJobById(id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job details');
      }

      return response.data;
    } catch (error) {      throw error;
    }
  }

  async searchJobs(query: string, filters?: Omit<JobFilters, 'search'>): Promise<JobsResponse> {
    try {
      const searchFilters = { ...filters, search: query };
      return await this.getJobs(searchFilters);
    } catch (error) {      throw error;
    }
  }

  // Employer Methods
  async createJob(jobData: JobPostingData): Promise<any> {
    try {
      console.log('JobApiService: Creating job with data:', JSON.stringify(jobData, null, 2));
      
      const response = await apiService.createJob(jobData);
      
      console.log('JobApiService: Received response:', JSON.stringify(response, null, 2));
      
      if (!response.success) {
        console.error('JobApiService: Job creation failed:', response.error);
        throw new Error(response.error || 'Failed to create job posting');
      }

      console.log('JobApiService: Job created successfully, returning data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('JobApiService: Exception during job creation:', error);
      throw error;
    }
  }

  async updateJob(id: string, jobData: Partial<JobPostingData>): Promise<{ id: string; title: string; status: string; lastUpdated: string }> {
    try {
      const response = await apiService.updateJob(id, jobData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update job posting');
      }

      return response.data;
    } catch (error) {      throw error;
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      const response = await apiService.deleteJob(id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete job posting');
      }
    } catch (error) {      throw error;
    }
  }

  async getEmployerJobs(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<EmployerJobsResponse> {
    try {
      const response = await apiService.getEmployerJobs(params);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch employer jobs');
      }

      return response.data;
    } catch (error) {      throw error;
    }
  }

  async getJobStats(): Promise<{
    totalJobs: number;
    totalCompanies: number;
    jobsByType: Array<{ _id: string; count: number }>;
    topLocations: Array<{ _id: string; count: number }>;
  }> {
    try {
      const response = await apiService.getJobStats();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job statistics');
      }

      return response.data;
    } catch (error) {      throw error;
    }
  }

  // Utility Methods
  formatJobForDisplay(job: any): Job {
    return {
      id: job.id || job._id,
      title: job.title,
      company: job.company || job.companyName,
      companyDetails: job.companyDetails,
      location: job.location,
      salary: job.salary || 0,
      type: job.type,
      level: job.level,
      postedDate: job.postedDate,
      description: job.description,
      requirements: job.requirements || [],
      educationLevel: job.educationLevel,
      preferredCourse: job.preferredCourse,
      matchScore: job.matchScore,
      matchingSkills: job.matchingSkills,
      isRemote: job.isRemote || job.workplaceType === 'Remote',
      isHybrid: job.isHybrid || job.workplaceType === 'Hybrid',
      experienceLevel: job.experienceLevel || job.level,
      lastUpdated: job.lastUpdated,
      workplaceType: job.workplaceType
    };
  }

  formatJobsResponse(response: any): JobsResponse {
    return {
      jobs: response.jobs.map((job: any) => this.formatJobForDisplay(job)),
      pagination: response.pagination
    };
  }

  // Convert frontend job data to backend format
  formatJobDataForBackend(jobData: any): JobPostingData {
    return {
      title: jobData.title,
      description: jobData.description,
      location: jobData.location,
      salary: jobData.salary,
      salaryMin: jobData.salaryMin ? parseInt(jobData.salaryMin) : undefined,
      salaryMax: jobData.salaryMax ? parseInt(jobData.salaryMax) : undefined,
      type: jobData.type,
      level: jobData.level,
      department: jobData.department,
      workplaceType: jobData.workplaceType,
      remote: jobData.remote,
      requirements: Array.isArray(jobData.requirements) ? jobData.requirements.filter((req: string) => req.trim()) : [],
      responsibilities: Array.isArray(jobData.responsibilities) ? jobData.responsibilities.filter((resp: string) => resp.trim()) : [],
      benefits: Array.isArray(jobData.benefits) ? jobData.benefits.filter((ben: string) => ben.trim()) : [],
      educationLevel: jobData.educationLevel || '',
      preferredCourse: jobData.preferredCourse || '',
      status: jobData.status || 'active',
      maxApplications: jobData.maxApplications ? parseInt(jobData.maxApplications) : undefined
    };
  }
}

export const jobApiService = new JobApiService();
export default jobApiService;
