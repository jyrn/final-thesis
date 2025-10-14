interface DocumentResponse {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  fileSize: number;
  url: string; // Cloud storage URL
  uploadedAt: string;
  employerInfo?: {
    id: string;
    companyName: string;
    email: string;
  };
}

class DocumentService {
  private baseUrl = 'http://localhost:3001/api';

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Upload documents using cloud storage (FormData)
  async uploadDocuments(
    documents: File[], 
    companyDetails: any
  ): Promise<any> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add files to FormData
      documents.forEach(file => {
        const documentType = this.getDocumentType(file.name);
        formData.append(documentType, file);
      });
      
      // Add company details to FormData
      Object.keys(companyDetails).forEach(key => {
        if (companyDetails[key]) {
          formData.append(key, companyDetails[key]);
        }
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${this.baseUrl}/employers/upload-documents-cloud`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get document by ID
  async getDocument(documentId: string, isAdmin: boolean = false): Promise<DocumentResponse> {
    try {
      const endpoint = isAdmin 
        ? `${this.baseUrl}/admin/documents/${documentId}`
        : `${this.baseUrl}/employers/documents/${documentId}`;

      const response = await fetch(endpoint, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch document');
      }

      return data.document;
    } catch (error) {
      throw error;
    }
  }

  // Get all documents for current employer
  async getEmployerDocuments(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/employers/documents`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch documents');
      }

      return data.documents;
    } catch (error) {
      throw error;
    }
  }

  // View document in browser (using cloud URL)
  viewDocument(doc: DocumentResponse): void {
    try {
      // Open cloud URL directly in new tab
      window.open(doc.url, '_blank');
    } catch (error) {
      throw new Error('Failed to view document');
    }
  }

  // Download document (using cloud URL)
  downloadDocument(doc: DocumentResponse): void {
    try {
      // Create download link with cloud URL
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.target = '_blank'; // Open in new tab if download fails
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      throw new Error('Failed to download document');
    }
  }

  // Helper method to determine document type
  private getDocumentType(fileName: string): string {
    const name = fileName.toLowerCase();
    
    if (name.includes('profile') || name.includes('company')) {
      return 'companyProfile';
    } else if (name.includes('permit') || name.includes('business')) {
      return 'businessPermit';
    } else if (name.includes('philjobnet') || name.includes('registration')) {
      return 'philjobnetRegistration';
    } else if (name.includes('dole') || name.includes('case')) {
      return 'doleNoPendingCase';
    }
    
    // Default to company profile if can't determine
    return 'companyProfile';
  }

  // Check if document type is supported
  isSupportedFileType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    return supportedTypes.includes(file.type);
  }

  // Validate file size (max 10MB)
  isValidFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }
}

export default new DocumentService();
