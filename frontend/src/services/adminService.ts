import { AdminUser, DashboardStats, PendingEmployer, Job } from '../types/admin';

class AdminService {
  private baseUrl = `${process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api'}/admin`;

  private getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async login(email: string, password: string, adminLevel: string): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, adminLevel }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data.admin;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.baseUrl}/dashboard/stats`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch dashboard stats');
    }

    return data.stats;
  }

  // ===== ADMIN ONLY METHODS =====

  async getUsers(params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    
    const response = await fetch(`${this.baseUrl}/users?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch users');
    }

    return data;
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update user');
    }

    return data;
  }

  async deleteUser(userId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete user');
    }

    return data;
  }

  async completelyDeleteJobseeker(userId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/jobseekers/${userId}/complete`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to completely delete jobseeker');
    }

    return data;
  }

  async getSystemAnalytics(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/analytics/system`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch system analytics');
    }

    return data.analytics;
  }

  async getAllEmployers(status?: 'pending' | 'verified' | 'rejected'): Promise<PendingEmployer[]> {
    const url = status 
      ? `${this.baseUrl}/employers?status=${status}`
      : `${this.baseUrl}/employers`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || 'Failed to fetch employers');
    }

    return data.employers || [];
  }

  async getPendingEmployers(): Promise<PendingEmployer[]> {
    const response = await fetch(`${this.baseUrl}/employers/pending`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || 'Failed to fetch pending employers');
    }

    return data.employers;
  }

  async getPendingDocuments(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/documents/pending`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch pending documents');
    }

    return data.documents;
  }

  async getEmployerDocuments(employerId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/employers/${employerId}/documents`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch employer documents');
    }

    return data.documents;
  }

  async verifyDocument(documentId: string, action: 'approve' | 'reject', rejectionReason?: string, adminNotes?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/verify`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        action,
        rejectionReason,
        adminNotes
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to verify document');
    }
  }

  async verifyEmployer(employerId: string, action: 'approve' | 'reject', reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employers/${employerId}/verify`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update employer status');
    }
  }

  async getJobs(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${this.baseUrl}/jobs?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch jobs');
    }

    return data;
  }

  async getJobApplicationCount(jobId: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/applications/count`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return 0;
      }

      return data.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get all applications for admin (using the new admin endpoint)
  async getAllApplications(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/applications`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      if (data.success && data.applications) {
        return data.applications;
      }
      
      return [];
      
    } catch (error) {
      return [];
    }
  }

  // Get all jobseekers for admin
  async getAllJobSeekers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/jobseekers/all`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.jobseekers || [];
      }
      return [];
    } catch (error) {      return [];
    }
  }

  // Get jobseeker users for admin (admin-accessible alternative to getUsers)
  async getJobseekerUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/jobseekers/users`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
      return [];
    } catch (error) {      return [];
    }
  }

  // Get all resumes for admin - fetch directly from resumes endpoint
  async getAllResumes(): Promise<any[]> {
    try {
      // Try to fetch from a direct resumes endpoint first
      const response = await fetch(`${this.baseUrl}/resumes/all`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.resumes) {
          return data.resumes;
        }
      }
      
      // Fallback: Extract resume data from applications
      const applications = await this.getAllApplications();
      
      // Extract unique resumes from applications
      const resumesMap = new Map();
      
      applications.forEach((app: any) => {
        
        if (app.resumeData && app.jobSeekerUid) {
          resumesMap.set(app.jobSeekerUid, {
            jobSeekerUid: app.jobSeekerUid,
            personalInfo: app.resumeData.personalInfo || {},
            skills: app.resumeData.skills || [],
            workExperience: app.resumeData.workExperience || [],
            education: app.resumeData.education || [],
            summary: app.resumeData.summary || '',
            applicantName: app.applicantName,
            applicantEmail: app.applicantEmail,
            applicantPhone: app.applicantPhone
          });
        } else if (app.jobSeekerUid) {
          // Even if no resumeData, create entry with basic info
          resumesMap.set(app.jobSeekerUid, {
            jobSeekerUid: app.jobSeekerUid,
            personalInfo: { 
              fullName: app.applicantName,
              email: app.applicantEmail,
              phone: app.applicantPhone
            },
            skills: [],
            workExperience: [],
            education: [],
            summary: '',
            applicantName: app.applicantName,
            applicantEmail: app.applicantEmail,
            applicantPhone: app.applicantPhone
          });
        }
      });
      
      const extractedResumes = Array.from(resumesMap.values());
      
      return extractedResumes;
      
    } catch (error) {      return [];
    }
  }

  async updateJobStatus(jobId: string, status: string, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to update job status');
    }
  }


  async bulkVerifyDocuments(employerId: string, documentIds: string[], action: 'approve' | 'reject', reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employers/${employerId}/documents/bulk-verify`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ documentIds, action, reason }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to bulk update document status');
    }

    return data;
  }

  async getAnalytics(period: string = '30') {
    const response = await fetch(`${this.baseUrl}/analytics/users?period=${period}`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch analytics');
    }

    return data.analytics;
  }

  // Super Admin only methods
  async getAdminUsers(): Promise<AdminUser[]> {
    const response = await fetch(`${this.baseUrl}/users?role=admin`, {
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch admin users');
    }

    return data.users;
  }

  async createAdmin(adminData: {
    email: string;
    adminName: string;
    department: string;
    role: 'pesostaff' | 'admin';
    password: string;
  }): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/admins`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        email: adminData.email,
        adminName: adminData.adminName,
        department: adminData.department,
        adminLevel: adminData.role, // Backend expects adminLevel
        password: adminData.password
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create admin user');
    }

    return data.admin;
  }

  // Authentication helpers
  isAuthenticated(): boolean {
    return localStorage.getItem('adminToken') !== null;
  }

  getCurrentAdmin(): AdminUser | null {
    const adminData = localStorage.getItem('adminUser');
    return adminData ? JSON.parse(adminData) : null;
  }

  logout(): void {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
  }

  // Report generation methods
  async generateReport(params: {
    reportType: string;
    startDate: string;
    endDate: string;
    format: 'pdf' | 'csv' | 'json' | 'xlsx';
    includeDetails: boolean;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/reports/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to generate report');
    }

    return data;
  }

  async getReportHistory(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/reports/history`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch report history');
    }

    return data.reports;
  }

  async generateAllReports(params: {
    startDate: string;
    endDate: string;
    format: 'pdf' | 'csv' | 'json' | 'xlsx';
    includeDetails: boolean;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/reports/generate-all`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to generate all reports');
    }

    return data;
  }

  // Job Demand Analytics
  async getJobDemandAnalytics(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/job-demand-analytics`, {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch job demand analytics');
    }

    return data.data;
  }

}

export default new AdminService();
