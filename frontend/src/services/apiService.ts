import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: any;
  message?: string;
  error?: string;
}

class ApiService {
  private async getAuthHeaders(contentType: string = 'application/json'): Promise<HeadersInit> {
    const token = await auth.currentUser?.getIdToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        // Handle removed account - redirect to login with error message
        if (response.status === 403 && data.error === 'Account has been removed') {
          // Clear auth state and redirect
          await auth.signOut();
          localStorage.setItem('accountRemovedMessage', data.message || 'Your account has been permanently removed from the system.');
          window.location.href = '/auth/jobseeker';
          return {
            success: false,
            error: data.error
          };
        }
        
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`
        };
      }
      
      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response'
      };
    }
  }

  // Auth endpoints
  async createUserProfile(userData: {
    uid: string;
    email: string;
    role: 'jobseeker' | 'employer';
    firstName?: string;
    lastName?: string;
    middleName?: string;
    companyName?: string;
    emailVerified?: boolean;
  }): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/create-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    return this.handleResponse(response);
  }

  async checkEmailExists(email: string, role?: string): Promise<ApiResponse> {
    const url = new URL(`${API_BASE_URL}/auth/check-email/${encodeURIComponent(email)}`);
    if (role) {
      url.searchParams.append('role', role);
    }
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    // For checkEmailExists, we want to return the data even for 404 responses
    // since 404 just means the email doesn't exist
    return {
      success: response.ok,
      data: data,
      error: !response.ok ? data.error : undefined
    };
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`);
    return this.handleResponse(response);
  }

  async resendVerification(email: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    return this.handleResponse(response);
  }

  async sendOTP(email: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    return this.handleResponse(response);
  }

  async verifyOTP(email: string, otp: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp })
    });
    
    return this.handleResponse(response);
  }

  async verifyToken(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  async getCurrentUser(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  // User endpoints
  async getUserProfile(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  async updateUserProfile(userData: any): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(userData)
    });
    
    return this.handleResponse(response);
  }

  async uploadProfilePicture(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    const headers = await this.getAuthHeaders();
    // Remove Content-Type to let browser set it with boundary for FormData
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/users/profile-picture-cloud`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    return this.handleResponse(response);
  }

  async removeProfilePicture(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/profile-picture-cloud`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }

  async checkUserExists(uid: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/users/check/${uid}`);
    return this.handleResponse(response);
  }

  async getUserByUid(uid: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  // Jobseeker-specific endpoints
  async get(endpoint: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  async post(endpoint: string, data?: any, options?: { headers?: HeadersInit }): Promise<ApiResponse> {
    let headers = await this.getAuthHeaders();
    
    // If custom headers are provided (e.g., for file uploads), merge them
    if (options?.headers) {
      headers = { ...headers, ...options.headers };
      // Remove Content-Type for FormData uploads
      if (data instanceof FormData) {
        delete (headers as any)['Content-Type'];
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  async put(endpoint: string, data: any): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  async delete(endpoint: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }

  // Job endpoints
  async getJobs(params?: {
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
  }): Promise<ApiResponse> {
    const url = new URL(`${API_BASE_URL}/jobs`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString());
    return this.handleResponse(response);
  }

  async getJobById(id: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
    return this.handleResponse(response);
  }

  async createJob(jobData: any): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(jobData)
    });
    
    return this.handleResponse(response);
  }

  async updateJob(id: string, jobData: any): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(jobData)
    });
    
    return this.handleResponse(response);
  }

  async deleteJob(id: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }

  async getEmployerJobs(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const url = new URL(`${API_BASE_URL}/jobs/employer/my-jobs`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const headers = await this.getAuthHeaders();
    const response = await fetch(url.toString(), { headers });
    return this.handleResponse(response);
  }

  async getJobStats(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/jobs/stats/overview`);
    return this.handleResponse(response);
  }

  // Resume endpoints
  async uploadResume(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('resume', file);
    
    const headers = await this.getAuthHeaders();
    // Remove Content-Type header to let browser set it with boundary for multipart/form-data
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    return this.handleResponse(response);
  }

  async getResumes(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/resumes`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  async getCurrentResume(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/resumes/current`, {
      headers
    });
    
    return this.handleResponse(response);
  }

  async activateResume(resumeId: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}/activate`, {
      method: 'PUT',
      headers
    });
    
    return this.handleResponse(response);
  }

  async deleteResume(resumeId: string): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }

  async downloadResume(resumeId: string): Promise<Response> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}/download`, {
      headers
    });
    
    return response; // Return raw response for file download
  }

  async parseResume(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('resume', file);
    
    const headers = await this.getAuthHeaders();
    // Remove Content-Type header to let browser set it with boundary for multipart/form-data
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/resumes/parse`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    return this.handleResponse(response);
  }

  // Get user's job applications
  async getUserApplications(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/applications/user`, {
      method: 'GET',
      headers
    });
    
    return this.handleResponse(response);
  }

  // Saved jobs methods
  async getSavedJobs(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobseekers/saved-jobs`, {
      method: 'GET',
      headers
    });
    
    return this.handleResponse(response);
  }

  async toggleSavedJob(jobId: string | number): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobseekers/saved-jobs/${jobId}`, {
      method: 'POST',
      headers
    });
    
    return this.handleResponse(response);
  }

  // Account management methods
  async deactivateAccount(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobseekers/deactivate-account`, {
      method: 'PUT',
      headers
    });
    
    return this.handleResponse(response);
  }

  async deleteAccount(): Promise<ApiResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/jobseekers/delete-account`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
