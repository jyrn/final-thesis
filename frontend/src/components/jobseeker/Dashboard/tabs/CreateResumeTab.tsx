import React, { useState, useEffect, useRef } from 'react';
import { FiDownload, FiSave, FiUser, FiBriefcase, FiFileText, FiPlus, FiMinus, FiEdit3, FiSave as FiSaveIcon, FiX, FiMail, FiPhone, FiMapPin, FiClock, FiCalendar, FiTrash2, FiStar, FiUpload, FiCheck, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { auth } from '../../../../config/firebase';
import psgc from "@dctsph/psgc";
import jobseekerCloudService from '../../../../services/jobseekerCloudService';
import { apiService } from '../../../../services/apiService';
import styles from './CreateResumeTab.module.css';
import dashboardStyles from '../../../../pages/jobseeker/Dashboard.module.css';

// Year Picker Component
interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
  className?: string;
}

const YearPicker: React.FC<YearPickerProps> = ({ 
  value, 
  onChange, 
  disabled = false, 
  minYear = 1950, 
  maxYear = new Date().getFullYear() + 10,
  placeholder = "Select year",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDecade, setCurrentDecade] = useState(Math.floor((value ? parseInt(value) : new Date().getFullYear()) / 12) * 12);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateYears = () => {
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(currentDecade + i);
    }
    return years;
  };

  const handleYearSelect = (year: number) => {
    onChange(year.toString());
    setIsOpen(false);
  };

  const navigateDecade = (direction: 'prev' | 'next') => {
    setCurrentDecade(prev => direction === 'prev' ? prev - 12 : prev + 12);
  };

  const years = generateYears();
  const startYear = years[0];
  const endYear = years[years.length - 1];

  return (
    <div className={`${styles.yearPickerContainer} ${className}`} ref={containerRef}>
      <div 
        className={`${styles.formInput} ${styles.yearPickerInput} ${disabled ? styles.inputError : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: disabled ? '#f9fafb' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? '#9ca3af' : '#1f2937'
        }}
      >
        {value || placeholder}
      </div>
      
      {isOpen && !disabled && (
        <div className={styles.yearPickerDropdown}>
          <div className={styles.yearPickerHeader}>
            <button 
              className={styles.yearPickerNavButton}
              onClick={() => navigateDecade('prev')}
              type="button"
            >
              ‹
            </button>
            <div className={styles.yearPickerTitle}>
              {startYear} - {endYear}
            </div>
            <button 
              className={styles.yearPickerNavButton}
              onClick={() => navigateDecade('next')}
              type="button"
            >
              ›
            </button>
          </div>
          
          <div className={styles.yearPickerGrid}>
            {years.map(year => {
              const isSelected = value === year.toString();
              const isDisabled = year < minYear || year > maxYear;
              
              return (
                <div
                  key={year}
                  className={`${styles.yearPickerItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                  onClick={() => !isDisabled && handleYearSelect(year)}
                >
                  {year}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
  address: string;
  zipCode: string;
  age: string;
  birthday: string;
  photo?: string; // Cloud storage URL or legacy base64
  // Readable location names (loaded from database)
  regionName?: string;
  provinceName?: string;
  cityName?: string;
  barangayName?: string;
}

interface Experience {
  company: string;
  position: string;
  duration: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface EducationLevel {
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Certificate {
  name: string;
  issuer: string;
  date: string;
  description: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string;
  startDate: string;
  endDate: string;
  url?: string;
}

interface Award {
  title: string;
  issuer: string;
  date: string;
  description: string;
}

interface VolunteerExperience {
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
}

interface OptionalSection {
  id: string;
  type: 'certificates' | 'projects' | 'awards' | 'volunteer';
  title: string;
  data: Certificate[] | Project[] | Award[] | VolunteerExperience[];
}

interface SectionOrder {
  id: string;
  type: 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'optional';
  title: string;
  optionalType?: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: EducationLevel[];
  skills: string[];
  certifications: string[];
  optionalSections: OptionalSection[];
  sectionOrder: SectionOrder[];
}

interface CreateResumeTabProps {
  resumeFormData?: ResumeData | null;
  onResumeDataChange?: (data: ResumeData) => void;
}

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Helper function to migrate old education format to new format
const migrateEducationData = (education: any): EducationLevel[] => {
  if (Array.isArray(education)) {
    return education;
  }
  
  // Old format: convert object to array
  const educationArray: EducationLevel[] = [];
  
  if (education?.tertiary && (education.tertiary.major || education.tertiary.school)) {
    educationArray.push({
      degree: education.tertiary.major || '',
      school: education.tertiary.school || '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  }
  
  if (education?.secondary && (education.secondary.major || education.secondary.school)) {
    educationArray.push({
      degree: education.secondary.major || '',
      school: education.secondary.school || '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  }
  
  if (education?.primary && (education.primary.major || education.primary.school)) {
    educationArray.push({
      degree: education.primary.major || '',
      school: education.primary.school || '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  }
  
  // If no education entries, add empty one
  if (educationArray.length === 0) {
    educationArray.push({
      degree: '',
      school: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  }
  
  return educationArray;
};

const CreateResumeTab: React.FC<CreateResumeTabProps> = ({ 
  resumeFormData, 
  onResumeDataChange 
}) => {
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      address: '',
      zipCode: '',
      age: '',
      birthday: '',
      photo: ''
    },
    summary: '',
    experience: [{
      company: '',
      position: '',
      duration: '',
      description: '',
      location: '',
      startDate: '',
      endDate: ''
    }],
    education: [{
      degree: '',
      school: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    }],
    skills: [''],
    certifications: [''],
    optionalSections: [],
    sectionOrder: [
      { id: 'personal', type: 'personal', title: 'Personal Information' },
      { id: 'summary', type: 'summary', title: 'Professional Summary' },
      { id: 'experience', type: 'experience', title: 'Work Experience' },
      { id: 'education', type: 'education', title: 'Educational Background' },
      { id: 'skills', type: 'skills', title: 'Skills' }
    ]
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isResumeGenerated, setIsResumeGenerated] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [generationStep, setGenerationStep] = useState<'generating' | 'success'>('generating');
  const [isPDFReady, setIsPDFReady] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExistingResume, setHasExistingResume] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeParseSuccess, setResumeParseSuccess] = useState(false);
  
  // PSGC dropdown options
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  // Load PSGC data on component mount
  useEffect(() => {
    try {
      if (psgc && typeof psgc.getAllRegions === 'function') {
        const regionData = psgc.getAllRegions();
        setRegions(regionData);
      } else {
        // Fallback data
        const fallbackRegions = [
          { regCode: '130000000', regDesc: 'National Capital Region (NCR)' },
          { regCode: '010000000', regDesc: 'Region I (Ilocos Region)' },
          { regCode: '020000000', regDesc: 'Region II (Cagayan Valley)' },
          { regCode: '030000000', regDesc: 'Region III (Central Luzon)' },
          { regCode: '040000000', regDesc: 'Region IV-A (CALABARZON)' }
        ];
        setRegions(fallbackRegions);
      }
    } catch (error) {
      console.error('Error loading PSGC data:', error);
      setRegions([]);
    }
  }, []);

  // Calculate age when birthday is loaded from existing data
  useEffect(() => {
    if (resumeData.personalInfo.birthday && !resumeData.personalInfo.age) {
      handleBirthdayChange(resumeData.personalInfo.birthday);
    }
  }, [resumeData.personalInfo.birthday]);

  // Load provinces for a given region (without clearing dependent fields)
  const loadProvincesForRegion = (regionCode: string) => {
    if (regionCode && psgc) {
      try {
        let provinceData = [];
        
        if (typeof psgc.getProvincesByRegion === 'function') {
          provinceData = psgc.getProvincesByRegion(regionCode);
        } else if (psgc.provinces && Array.isArray(psgc.provinces)) {
          provinceData = psgc.provinces.filter((p: any) => (p.reg_code || p.regCode) === regionCode);
        } else if (psgc.getAllProvinces && typeof psgc.getAllProvinces === 'function') {
          const allProvinces = psgc.getAllProvinces();
          provinceData = allProvinces.filter((p: any) => (p.reg_code || p.regCode) === regionCode);
        }
        
        setProvinces(provinceData);
      } catch (error) {
        console.error('Error loading provinces:', error);
        setProvinces([]);
      }
    } else {
      setProvinces([]);
    }
  };

  // Handle region change
  const handleRegionChange = (regionCode: string) => {
    updatePersonalInfo('region', regionCode);
    updatePersonalInfo('province', '');
    updatePersonalInfo('city', '');
    updatePersonalInfo('barangay', '');
    
    loadProvincesForRegion(regionCode);
    setCities([]);
    setBarangays([]);
  };

  // Load cities for a given province (without clearing dependent fields)
  const loadCitiesForProvince = (provinceCode: string) => {
    if (provinceCode && psgc) {
      try {
        let cityData = [];
        
        if (typeof psgc.getMunicipalitiesByProvince === 'function') {
          cityData = psgc.getMunicipalitiesByProvince(provinceCode);
        } else if (psgc.cities && Array.isArray(psgc.cities)) {
          cityData = psgc.cities.filter((c: any) => (c.prov_code || c.provCode) === provinceCode);
        } else if (psgc.getAllCities && typeof psgc.getAllCities === 'function') {
          const allCities = psgc.getAllCities();
          cityData = allCities.filter((c: any) => (c.prov_code || c.provCode) === provinceCode);
        }
        
        setCities(cityData);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
      }
    } else {
      setCities([]);
    }
  };

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    updatePersonalInfo('province', provinceCode);
    updatePersonalInfo('city', '');
    updatePersonalInfo('barangay', '');
    
    loadCitiesForProvince(provinceCode);
    setBarangays([]);
  };

  // Load barangays for a given city (without clearing barangay value)
  const loadBarangaysForCity = (cityCode: string) => {
    if (cityCode && psgc) {
      try {
        let barangayData = [];
        
        if (typeof psgc.getBarangaysByMunicipality === 'function') {
          barangayData = psgc.getBarangaysByMunicipality(cityCode);
        } else if (psgc.barangays && Array.isArray(psgc.barangays)) {
          barangayData = psgc.barangays.filter((b: any) => (b.mun_code || b.citymunCode) === cityCode);
        } else if (psgc.getAllBarangays && typeof psgc.getAllBarangays === 'function') {
          const allBarangays = psgc.getAllBarangays();
          barangayData = allBarangays.filter((b: any) => (b.mun_code || b.citymunCode) === cityCode);
        }
        
        setBarangays(barangayData);
      } catch (error) {
        console.error('Error loading barangays:', error);
        setBarangays([]);
      }
    } else {
      setBarangays([]);
    }
  };

  // Handle city change
  const handleCityChange = (cityCode: string) => {
    updatePersonalInfo('city', cityCode);
    updatePersonalInfo('barangay', ''); // Clear barangay when city changes
    loadBarangaysForCity(cityCode);
  };

  // Handle barangay change
  const handleBarangayChange = (barangayCode: string) => {
    updatePersonalInfo('barangay', barangayCode);
  };

  // Handle birthday change and auto-calculate age
  const handleBirthdayChange = (birthday: string) => {
    updatePersonalInfo('birthday', birthday);
    
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Ensure age is not negative
      if (age >= 0) {
        updatePersonalInfo('age', age.toString());
      } else {
        updatePersonalInfo('age', '');
      }
    } else {
      updatePersonalInfo('age', '');
    }
  };

  // Handle email validation
  const handleEmailChange = (email: string) => {
    updatePersonalInfo('email', email);
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle phone number formatting (Philippine format)
  const handlePhoneChange = (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Format based on length
    let formattedPhone = '';
    
    if (digitsOnly.length <= 4) {
      formattedPhone = digitsOnly;
    } else if (digitsOnly.length <= 7) {
      formattedPhone = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    } else if (digitsOnly.length <= 11) {
      // Philippine mobile format: 0XXX-XXX-XXXX
      if (digitsOnly.startsWith('0')) {
        formattedPhone = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
      } else {
        // Add leading 0 if not present
        const withZero = '0' + digitsOnly;
        if (withZero.length <= 11) {
          formattedPhone = `${withZero.slice(0, 4)}-${withZero.slice(4, 7)}-${withZero.slice(7)}`;
        } else {
          formattedPhone = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 11)}`;
        }
      }
    } else {
      // Limit to 11 digits max
      const limitedDigits = digitsOnly.slice(0, 11);
      formattedPhone = `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4, 7)}-${limitedDigits.slice(7)}`;
    }
    
    updatePersonalInfo('phone', formattedPhone);
  };

  // Validate Philippine phone number
  const isValidPhoneNumber = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    // Philippine mobile numbers: 11 digits starting with 09
    // Philippine landline: 7-8 digits (area code + number)
    return (digitsOnly.length === 11 && digitsOnly.startsWith('09')) || 
           (digitsOnly.length >= 7 && digitsOnly.length <= 8);
  };

  // Validate work experience dates
  const validateExperienceDates = (startDate: string, endDate: string) => {
    if (!startDate) return { isValid: true, error: '' };
    
    const start = new Date(startDate + '-01');
    const now = new Date();
    
    // Check if start date is not in the future
    if (start > now) {
      return { isValid: false, error: 'Start date cannot be in the future' };
    }
    
    // Check if start date is reasonable (not before 1950)
    const minDate = new Date('1950-01-01');
    if (start < minDate) {
      return { isValid: false, error: 'Start date seems too early' };
    }
    
    // If end date is provided and not "present", validate it
    if (endDate && endDate !== 'present') {
      const end = new Date(endDate + '-01');
      
      // Check if end date is not in the future (more than current month)
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (end > currentMonth) {
        return { isValid: false, error: 'End date cannot be in the future' };
      }
      
      // Check if end date is after start date
      if (end < start) {
        return { isValid: false, error: 'End date must be after start date' };
      }
      
      // Check if the duration is reasonable (not more than 50 years)
      const yearsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (yearsDiff > 50) {
        return { isValid: false, error: 'Work duration seems too long' };
      }
    }
    
    return { isValid: true, error: '' };
  };

  // Get validation error for specific experience
  const getExperienceValidationError = (index: number) => {
    const exp = resumeData.experience[index];
    if (!exp) return '';
    
    const validation = validateExperienceDates(exp.startDate, exp.endDate);
    return validation.error;
  };

  // Validate education dates (years only for education)
  const validateEducationDates = (startDate: string, endDate: string) => {
    if (!startDate) return { isValid: true, error: '' };
    
    const startYear = new Date(startDate + '-01').getFullYear();
    const currentYear = new Date().getFullYear();
    
    // Check if start year is not in the future
    if (startYear > currentYear) {
      return { isValid: false, error: 'Start year cannot be in the future' };
    }
    
    // Check if start year is reasonable (not before 1950)
    if (startYear < 1950) {
      return { isValid: false, error: 'Start year seems too early' };
    }
    
    // If end date is provided and not "present", validate it
    if (endDate && endDate !== 'present') {
      const endYear = new Date(endDate + '-01').getFullYear();
      
      // Check if end year is not too far in the future (allow up to 10 years for ongoing studies)
      if (endYear > currentYear + 10) {
        return { isValid: false, error: 'End year seems too far in the future' };
      }
      
      // Check if end year is after start year
      if (endYear < startYear) {
        return { isValid: false, error: 'End year must be after start year' };
      }
      
      // Check if the duration is reasonable (not more than 15 years for education)
      const yearsDiff = endYear - startYear;
      if (yearsDiff > 15) {
        return { isValid: false, error: 'Education duration seems too long' };
      }
    }
    
    return { isValid: true, error: '' };
  };

  // Get validation error for specific education
  const getEducationValidationError = (index: number) => {
    const edu = resumeData.education[index];
    if (!edu) return '';
    
    const validation = validateEducationDates(edu.startDate, edu.endDate);
    return validation.error;
  };

  // Get display names for PSGC codes
  const getLocationDisplayNames = () => {
    const { region, province, city, barangay } = resumeData.personalInfo;
    
    let regionName = '';
    let provinceName = '';
    let cityName = '';
    let barangayName = '';

    try {
      // Get region name
      if (region && psgc && typeof psgc.getAllRegions === 'function') {
        const regionData = psgc.getAllRegions().find((r: any) => (r.reg_code || r.regCode) === region);
        regionName = regionData ? (regionData.name || regionData.regDesc) : '';
      }

      // Get province name
      if (province && psgc && typeof psgc.getProvincesByRegion === 'function' && region) {
        const provinceData = psgc.getProvincesByRegion(region).find((p: any) => (p.prv_code || p.prov_code || p.provCode) === province);
        provinceName = provinceData ? (provinceData.name || provinceData.provDesc) : '';
      }

      // Get city name
      if (city && psgc && typeof psgc.getMunicipalitiesByProvince === 'function' && province) {
        const cityData = psgc.getMunicipalitiesByProvince(province).find((c: any) => (c.mun_code || c.citymunCode) === city);
        cityName = cityData ? (cityData.name || cityData.citymunDesc) : '';
      }

      // Get barangay name
      if (barangay && psgc && typeof psgc.getBarangaysByMunicipality === 'function' && city) {
        const barangayData = psgc.getBarangaysByMunicipality(city).find((b: any) => (b.bgy_code || b.brgy_code || b.brgyCode) === barangay);
        barangayName = barangayData ? (barangayData.name || barangayData.brgyDesc) : '';
      }
    } catch (error) {
      console.warn('Error getting location display names:', error);
      // Continue with empty strings if PSGC fails
    }

    return { regionName, provinceName, cityName, barangayName };
  };

  // Function to load existing resume data from database
  const loadExistingResumeData = async () => {
    try {
      console.log('Loading resume data from database...');
      
      if (!auth.currentUser) {
        console.log('No authenticated user found');
        return;
      }
      
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('http://localhost:3001/api/resumes/current', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Loaded resume data from database:', result.data);
        
        // Transform database data back to form format
        const dbData = result.data;
        const transformedData = {
          personalInfo: {
            firstName: dbData.personalInfo.fullName ? dbData.personalInfo.fullName.split(' ')[0] || '' : '',
            lastName: dbData.personalInfo.fullName ? dbData.personalInfo.fullName.split(' ').slice(1).join(' ') || '' : '',
            email: dbData.personalInfo.email || '',
            phone: dbData.personalInfo.phone || '',
            // Load PSGC codes from location object
            region: dbData.personalInfo.location?.region || '',
            province: dbData.personalInfo.location?.province || '',
            city: dbData.personalInfo.location?.city || '',
            barangay: dbData.personalInfo.location?.barangay || '',
            address: dbData.personalInfo.address || '',
            zipCode: dbData.personalInfo.zipCode || '',
            age: dbData.personalInfo.age || '',
            birthday: dbData.personalInfo.birthday || '',
            photo: dbData.personalInfo.photo || '',
            // Include readable location names from database for PDF generation
            readableLocationRegion: dbData.personalInfo.readableLocation?.region || '',
            readableLocationProvince: dbData.personalInfo.readableLocation?.province || '',
            readableLocationCity: dbData.personalInfo.readableLocation?.city || '',
            readableLocationBarangay: dbData.personalInfo.readableLocation?.barangay || ''
          },
          summary: dbData.summary || '',
          experience: dbData.workExperience || [{
            company: '',
            position: '',
            duration: '',
            description: '',
            location: '',
            startDate: '',
            endDate: ''
          }],
          education: (dbData.education || []).map((edu: any) => ({
            degree: edu.degree || '',
            school: edu.school || '',
            location: edu.location || '',
            // Convert year back to YYYY-01 format for the year picker
            startDate: edu.startDate ? `${edu.startDate}-01` : '',
            endDate: edu.endDate === 'present' ? 'present' : (edu.endDate ? `${edu.endDate}-01` : '')
          })),
          skills: dbData.skills || [''],
          certifications: [''], // Not stored in DB yet, keep empty
          optionalSections: dbData.optionalSections || [],
          sectionOrder: dbData.sectionOrder || [
            { id: 'personal', type: 'personal', title: 'Personal Information' },
            { id: 'summary', type: 'summary', title: 'Professional Summary' },
            { id: 'experience', type: 'experience', title: 'Work Experience' },
            { id: 'education', type: 'education', title: 'Educational Background' },
            { id: 'skills', type: 'skills', title: 'Skills' }
          ]
        };
        
        console.log('Transformed data for form:', transformedData);
        setResumeData(transformedData);
        setHasExistingResume(true);
        setIsPDFReady(true); // Resume exists, PDF is ready
        
        // Populate dependent dropdowns based on loaded PSGC codes
        const personalInfo = transformedData.personalInfo;
        
        // Load provinces if region is selected (without clearing dependent fields)
        if (personalInfo.region) {
          loadProvincesForRegion(personalInfo.region);
        }
        
        // Load cities if province is selected (with a small delay to ensure provinces are loaded)
        if (personalInfo.province) {
          setTimeout(() => {
            loadCitiesForProvince(personalInfo.province);
          }, 100);
        }
        
        // Load barangays if city is selected (with a small delay to ensure cities are loaded)
        if (personalInfo.city) {
          setTimeout(() => {
            loadBarangaysForCity(personalInfo.city);
          }, 200);
        }
        
        // Update parent component with loaded data
        if (onResumeDataChange) {
          onResumeDataChange(transformedData);
        }
      } else if (response.status === 404) {
        console.log('No existing resume found in database');
        // No existing resume, keep default empty state
      } else {
        console.error('Error loading resume:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading existing resume data:', error);
    }
  };

  // Load existing resume data on component mount
  useEffect(() => {
    if (auth.currentUser) {
      loadExistingResumeData();
    } else {
      // Wait for auth to be ready
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          loadExistingResumeData();
          unsubscribe();
        }
      });
      return unsubscribe;
    }
  }, []);

  // Check if all required fields are filled
  const isFormValid = () => {
    const { personalInfo, summary, experience, education, skills } = resumeData;
    
    // Check personal info
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email || !personalInfo.phone || !personalInfo.region || !personalInfo.province || !personalInfo.city || !personalInfo.barangay || !personalInfo.address || !personalInfo.zipCode || !personalInfo.age || !personalInfo.birthday) {
      return false;
    }
    
    // Check summary
    if (!summary.trim()) {
      return false;
    }
    
    // Check at least one experience with company and position
    const hasValidExperience = experience.some(exp => exp.company.trim() && exp.position.trim());
    if (!hasValidExperience) {
      return false;
    }
    
    // Validate experience dates
    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      if (exp.company.trim() || exp.position.trim()) { // Only validate if experience has content
        const validation = validateExperienceDates(exp.startDate, exp.endDate);
        if (!validation.isValid) {
          return false;
        }
      }
    }
    
    // Check at least one education entry
    if (!education.some(edu => edu.degree && edu.school)) {
      return false;
    }
    
    // Validate education dates
    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      if (edu.degree.trim() || edu.school.trim()) { // Only validate if education has content
        const validation = validateEducationDates(edu.startDate, edu.endDate);
        if (!validation.isValid) {
          return false;
        }
      }
    }
    
    // Check at least one skill
    const hasValidSkills = skills.some(skill => skill.trim());
    if (!hasValidSkills) {
      return false;
    }
    
    return true;
  };

  const updateResumeData = (field: keyof ResumeData, value: any) => {
    const newData = { ...resumeData, [field]: value };
    setResumeData(newData);
    setHasUnsavedChanges(true);
    setIsPDFReady(false);
    // Update parent component to persist data across tab switches
    if (onResumeDataChange) {
      onResumeDataChange(newData);
    }
  };

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
    setIsPDFReady(false);
  };

  const updateSummary = (value: string) => {
    updateResumeData('summary', value);
  };

  const addExperience = () => {
    const newExperience = [...resumeData.experience, {
      company: '',
      position: '',
      duration: '',
      description: '',
      location: '',
      startDate: '',
      endDate: ''
    }];
    updateResumeData('experience', newExperience);
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const newExperience = resumeData.experience.map((exp, i) => 
      i === index ? { ...exp, [field]: value } : exp
    );
    updateResumeData('experience', newExperience);
  };

  const removeExperience = (index: number) => {
    const newExperience = resumeData.experience.filter((_, i) => i !== index);
    updateResumeData('experience', newExperience);
  };

  const addEducation = () => {
    const newEducation = [...resumeData.education, {
      degree: '',
      school: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    }];
    updateResumeData('education', newEducation);
  };

  const updateEducation = (index: number, field: keyof EducationLevel, value: string) => {
    const newEducation = resumeData.education.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
    );
    updateResumeData('education', newEducation);
  };

  const removeEducation = (index: number) => {
    if (resumeData.education.length > 1) {
      const newEducation = resumeData.education.filter((_, i) => i !== index);
      updateResumeData('education', newEducation);
    }
  };

  const addSkill = () => {
    const newSkills = [...resumeData.skills, ''];
    updateResumeData('skills', newSkills);
  };

  const updateSkill = (index: number, value: string) => {
    const newSkills = resumeData.skills.map((skill, i) => i === index ? value : skill);
    updateResumeData('skills', newSkills);
  };

  const removeSkill = (index: number) => {
    const newSkills = resumeData.skills.filter((_, i) => i !== index);
    updateResumeData('skills', newSkills);
  };

  const addCertification = () => {
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, '']
    }));
  };

  const updateCertification = (index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => i === index ? value : cert)
    }));
  };

  const removeCertification = (index: number) => {
    if (resumeData.certifications.length > 1) {
      setResumeData(prev => ({
        ...prev,
        certifications: prev.certifications.filter((_, i) => i !== index)
      }));
    }
  };

  // Optional Section Management Functions
  const addOptionalSection = (type: 'certificates' | 'projects' | 'awards' | 'volunteer') => {
    const sectionTitles = {
      certificates: 'Certificates & Seminars',
      projects: 'Projects',
      awards: 'Awards & Achievements',
      volunteer: 'Volunteer Experience'
    };

    const emptyData = {
      certificates: [{ name: '', issuer: '', date: '', description: '' }],
      projects: [{ name: '', description: '', technologies: '', startDate: '', endDate: '', url: '' }],
      awards: [{ title: '', issuer: '', date: '', description: '' }],
      volunteer: [{ organization: '', role: '', startDate: '', endDate: '', description: '', location: '' }]
    };

    const newSection: OptionalSection = {
      id: `${type}-${Date.now()}`,
      type,
      title: sectionTitles[type],
      data: emptyData[type] as any
    };

    const newOptionalSections = [...resumeData.optionalSections, newSection];
    const newSectionOrder = [...resumeData.sectionOrder, {
      id: newSection.id,
      type: 'optional' as const,
      title: sectionTitles[type],
      optionalType: type
    }];

    updateResumeData('optionalSections', newOptionalSections);
    setResumeData(prev => ({ ...prev, sectionOrder: newSectionOrder }));
  };

  const removeOptionalSection = (sectionId: string) => {
    const newOptionalSections = resumeData.optionalSections.filter(section => section.id !== sectionId);
    const newSectionOrder = resumeData.sectionOrder.filter(section => section.id !== sectionId);
    
    updateResumeData('optionalSections', newOptionalSections);
    setResumeData(prev => ({ ...prev, sectionOrder: newSectionOrder }));
  };

  const updateOptionalSection = (sectionId: string, data: any) => {
    const newOptionalSections = resumeData.optionalSections.map(section => 
      section.id === sectionId ? { ...section, data } : section
    );
    updateResumeData('optionalSections', newOptionalSections);
  };

  // Get available section types that haven't been added yet
  const getAvailableSectionTypes = () => {
    const existingTypes = resumeData.optionalSections.map(section => section.type);
    const allTypes = ['certificates', 'projects', 'awards', 'volunteer'] as const;
    return allTypes.filter(type => !existingTypes.includes(type));
  };

  // Certificate Functions
  const addCertificate = (sectionId: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'certificates') {
      const newData = [...(section.data as Certificate[]), { name: '', issuer: '', date: '', description: '' }];
      updateOptionalSection(sectionId, newData);
    }
  };

  const updateCertificate = (sectionId: string, index: number, field: keyof Certificate, value: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'certificates') {
      const newData = (section.data as Certificate[]).map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      );
      updateOptionalSection(sectionId, newData);
    }
  };

  const removeCertificate = (sectionId: string, index: number) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'certificates' && (section.data as Certificate[]).length > 1) {
      const newData = (section.data as Certificate[]).filter((_, i) => i !== index);
      updateOptionalSection(sectionId, newData);
    }
  };

  // Project Functions
  const addProject = (sectionId: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'projects') {
      const newData = [...(section.data as Project[]), { name: '', description: '', technologies: '', startDate: '', endDate: '', url: '' }];
      updateOptionalSection(sectionId, newData);
    }
  };

  const updateProject = (sectionId: string, index: number, field: keyof Project, value: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'projects') {
      const newData = (section.data as Project[]).map((project, i) => 
        i === index ? { ...project, [field]: value } : project
      );
      updateOptionalSection(sectionId, newData);
    }
  };

  const removeProject = (sectionId: string, index: number) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'projects' && (section.data as Project[]).length > 1) {
      const newData = (section.data as Project[]).filter((_, i) => i !== index);
      updateOptionalSection(sectionId, newData);
    }
  };

  // Award Functions
  const addAward = (sectionId: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'awards') {
      const newData = [...(section.data as Award[]), { title: '', issuer: '', date: '', description: '' }];
      updateOptionalSection(sectionId, newData);
    }
  };

  const updateAward = (sectionId: string, index: number, field: keyof Award, value: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'awards') {
      const newData = (section.data as Award[]).map((award, i) => 
        i === index ? { ...award, [field]: value } : award
      );
      updateOptionalSection(sectionId, newData);
    }
  };

  const removeAward = (sectionId: string, index: number) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'awards' && (section.data as Award[]).length > 1) {
      const newData = (section.data as Award[]).filter((_, i) => i !== index);
      updateOptionalSection(sectionId, newData);
    }
  };

  // Volunteer Functions
  const addVolunteerExperience = (sectionId: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'volunteer') {
      const newData = [...(section.data as VolunteerExperience[]), { organization: '', role: '', startDate: '', endDate: '', description: '', location: '' }];
      updateOptionalSection(sectionId, newData);
    }
  };

  const updateVolunteerExperience = (sectionId: string, index: number, field: keyof VolunteerExperience, value: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'volunteer') {
      const newData = (section.data as VolunteerExperience[]).map((vol, i) => 
        i === index ? { ...vol, [field]: value } : vol
      );
      updateOptionalSection(sectionId, newData);
    }
  };

  const removeVolunteerExperience = (sectionId: string, index: number) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'volunteer' && (section.data as VolunteerExperience[]).length > 1) {
      const newData = (section.data as VolunteerExperience[]).filter((_, i) => i !== index);
      updateOptionalSection(sectionId, newData);
    }
  };

  // Section Reordering Functions
  const moveSectionUp = (index: number) => {
    if (index > 1) { // Skip personal info (index 0)
      const newOrder = [...resumeData.sectionOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setResumeData(prev => ({ ...prev, sectionOrder: newOrder }));
      setHasUnsavedChanges(true);
    }
  };

  const moveSectionDown = (index: number) => {
    if (index > 0 && index < resumeData.sectionOrder.length - 1) { // Skip personal info
      const newOrder = [...resumeData.sectionOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setResumeData(prev => ({ ...prev, sectionOrder: newOrder }));
      setHasUnsavedChanges(true);
    }
  };

  // Function to render section controls
  const renderSectionControls = (sectionIndex: number, canMove = true) => {
    if (sectionIndex === 0) return null; // No controls for personal info
    
    return (
      <div className={styles.sectionControls}>
        {canMove && (
          <>
            <button
              onClick={() => moveSectionUp(sectionIndex)}
              className={styles.moveButton}
              title="Move section up"
              disabled={sectionIndex <= 1}
            >
              <FiChevronUp />
            </button>
            <button
              onClick={() => moveSectionDown(sectionIndex)}
              className={styles.moveButton}
              title="Move section down"
              disabled={sectionIndex >= resumeData.sectionOrder.length - 1}
            >
              <FiChevronDown />
            </button>
          </>
        )}
      </div>
    );
  };

  const generatePDF = (filename?: string, returnBlob = false) => {
    const doc = new jsPDF();
    const { personalInfo, summary, experience, education, skills } = resumeData;
    
    // Page margins and layout
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = 20;
    
    // Colors
    const blackColor = [0, 0, 0];
    const blueColor = [0, 100, 200]; // Blue for name
    const grayColor = [100, 100, 100]; // Gray for secondary text
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin + 10;
        return true;
      }
      return false;
    };
    
    // Header section with photo and name layout like the sample
    const photoWidth = 35; // Bigger photo - approximately 1.4 inches
    const photoHeight = 35; // Bigger photo - approximately 1.4 inches
    let hasPhoto = false;
    
    if (personalInfo.photo) {
      try {
        // Position photo on the top left - 2x2 ID picture format
        doc.addImage(personalInfo.photo, 'JPEG', margin, yPosition, photoWidth, photoHeight);
        hasPhoto = true;
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
      }
    }
    
    // Name - positioned next to photo, large and bold in blue
    const nameX = hasPhoto ? margin + photoWidth + 8 : margin;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Your Name';
    doc.text(fullName.toUpperCase(), nameX, yPosition + 8);
    
    // Contact information positioned next to name (right side of header)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    
    let contactY = yPosition + 8;
    
    // Construct address
    let regionName = '', provinceName = '', cityName = '', barangayName = '';
    const personalInfoAny = resumeData.personalInfo as any;
    if (personalInfoAny.readableLocationRegion) {
      regionName = personalInfoAny.readableLocationRegion;
      provinceName = personalInfoAny.readableLocationProvince || '';
      cityName = personalInfoAny.readableLocationCity || '';
      barangayName = personalInfoAny.readableLocationBarangay || '';
    } else {
      const displayNames = getLocationDisplayNames();
      regionName = displayNames.regionName;
      provinceName = displayNames.provinceName;
      cityName = displayNames.cityName;
      barangayName = displayNames.barangayName;
    }
    
    const addressParts = [];
    if (personalInfo.address) addressParts.push(personalInfo.address);
    if (barangayName) addressParts.push(barangayName);
    if (cityName) addressParts.push(cityName);
    if (provinceName) addressParts.push(provinceName);
    
    // Address
    if (addressParts.length > 0) {
      doc.text(`Address: ${addressParts.join(', ')}`, nameX, contactY + 5);
      contactY += 4;
    }
    
    // Phone
    if (personalInfo.phone) {
      doc.text(`Phone: ${personalInfo.phone}`, nameX, contactY + 5);
      contactY += 4;
    }
    
    // Email
    if (personalInfo.email) {
      doc.text(`Email: ${personalInfo.email}`, nameX, contactY + 5);
      contactY += 4;
    }
    
    // Adjust yPosition to account for header
    yPosition = Math.max(yPosition + photoHeight + 10, contactY + 10);
    
    // Helper function to add section headers - plain with underline
    const addSectionHeader = (title: string) => {
      checkPageBreak(20);
      
      // Add spacing before section
      yPosition += 8;
      
      // Section header - blue text with underline to match name color
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.text(title.toUpperCase(), margin, yPosition);
      
      // Add underline - extend to the end of the page margin with blue color
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
      
      yPosition += 8;
    };
    
    // Professional Summary
    if (summary) {
      addSectionHeader('Summary');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      const summaryLines = doc.splitTextToSize(summary, contentWidth);
      checkPageBreak(summaryLines.length * 4 + 10);
      doc.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 4 + 5;
    }
    
    // Work Experience
    const validExperience = experience.filter(exp => exp.company && exp.position);
    if (validExperience.length > 0) {
      addSectionHeader('Experience');
      
      validExperience.forEach((exp, index) => {
        // Calculate space needed for this experience entry
        const descLines = exp.description ? doc.splitTextToSize(exp.description, contentWidth - 8) : [];
        const spaceNeeded = 15 + (descLines.length * 4);
        checkPageBreak(spaceNeeded);
        
        // Job title - bold
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        doc.text(exp.position, margin, yPosition);
        
        // Duration (right aligned)
        let durationText = '';
        if (exp.startDate && exp.endDate && exp.endDate !== 'present') {
          const startDate = new Date(exp.startDate + '-01');
          const endDate = new Date(exp.endDate + '-01');
          const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          durationText = `${startMonth} - ${endMonth}`;
        } else if (exp.startDate) {
          const startDate = new Date(exp.startDate + '-01');
          const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          durationText = `${startMonth} - Present`;
        } else if (exp.duration) {
          durationText = exp.duration;
        }
        
        if (durationText) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const durationWidth = doc.getTextWidth(durationText);
          doc.text(durationText, pageWidth - margin - durationWidth, yPosition);
        }
        yPosition += 4;
        
        // Company name - italic
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(exp.company, margin, yPosition);
        yPosition += 4;
        
        // Description with bullet points
        if (exp.description) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
          
          // Split description into bullet points if it contains line breaks
          const descriptionParts = exp.description.split('\n').filter(part => part.trim());
          
          descriptionParts.forEach(part => {
            const bulletText = `• ${part.trim()}`;
            const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 8);
            checkPageBreak(bulletLines.length * 4 + 2);
            doc.text(bulletLines, margin + 8, yPosition);
            yPosition += bulletLines.length * 4;
          });
          yPosition += 5;
        }
        
        // Add spacing between experiences
        if (index < validExperience.length - 1) {
          yPosition += 8;
        }
      });
    }
    
    // Educational Background
    const validEducation = education.filter(edu => edu.degree && edu.school);
    if (validEducation.length > 0) {
      addSectionHeader('Education');
      
      validEducation.forEach((edu, index) => {
        checkPageBreak(25);
        
        // Degree (bold) with cleaner typography
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        doc.text(edu.degree, margin, yPosition);
        
        // Duration (right aligned) - format from start and end dates
        let durationText = '';
        if (edu.startDate && edu.endDate && edu.endDate !== 'present') {
          const startDate = new Date(edu.startDate + '-01');
          const endDate = new Date(edu.endDate + '-01');
          const startYear = startDate.getFullYear();
          const endYear = endDate.getFullYear();
          durationText = `${startYear} — ${endYear}`;
        } else if (edu.startDate) {
          const startDate = new Date(edu.startDate + '-01');
          const startYear = startDate.getFullYear();
          durationText = `${startYear} — Present`;
        }
        
        if (durationText) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
          const durationWidth = doc.getTextWidth(durationText);
          doc.text(durationText, pageWidth - margin - durationWidth, yPosition);
        }
        yPosition += 4;
        
        // School name (italic)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        doc.text(edu.school, margin, yPosition);
        yPosition += 6;
      });
    }
    
    // Skills section
    const validSkills = skills.filter(skill => skill && skill.trim() !== '');
    
    if (validSkills.length > 0) {
      addSectionHeader('Skills');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      
      // Display skills in a compact format
      const skillsText = validSkills.join(' • ');
      const skillLines = doc.splitTextToSize(skillsText, contentWidth);
      
      checkPageBreak(skillLines.length * 4 + 10);
      skillLines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += 4;
      });
      yPosition += 5;
    }

    // Optional Sections (in the order specified by sectionOrder)
    resumeData.optionalSections.forEach(section => {
      if (section.type === 'certificates') {
        const validCertificates = (section.data as Certificate[]).filter(cert => cert.name && cert.issuer);
        if (validCertificates.length > 0) {
          addSectionHeader('Certificates & Seminars');
          
          validCertificates.forEach((cert, index) => {
            checkPageBreak(20);
            
            // Certificate name - bold
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.text(cert.name, margin, yPosition);
            
            // Date (right aligned)
            if (cert.date) {
              const certDate = new Date(cert.date + '-01');
              const dateText = certDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += 4;
            
            // Issuer - italic
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(cert.issuer, margin, yPosition);
            yPosition += 4;
            
            // Description
            if (cert.description) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const descLines = doc.splitTextToSize(cert.description, contentWidth - 8);
              checkPageBreak(descLines.length * 4 + 2);
              doc.text(descLines, margin + 8, yPosition);
              yPosition += descLines.length * 4;
            }
            
            if (index < validCertificates.length - 1) {
              yPosition += 6;
            }
          });
        }
      }

      if (section.type === 'projects') {
        const validProjects = (section.data as Project[]).filter(project => project.name && project.description);
        if (validProjects.length > 0) {
          addSectionHeader('Projects');
          
          validProjects.forEach((project, index) => {
            checkPageBreak(25);
            
            // Project name - bold
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.text(project.name, margin, yPosition);
            
            // Date range (right aligned)
            let dateText = '';
            if (project.startDate && project.endDate) {
              const startDate = new Date(project.startDate + '-01');
              const endDate = new Date(project.endDate + '-01');
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              dateText = `${startMonth} - ${endMonth}`;
            } else if (project.startDate) {
              const startDate = new Date(project.startDate + '-01');
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              dateText = startMonth;
            }
            
            if (dateText) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += 4;
            
            // Technologies - italic
            if (project.technologies) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              doc.text(`Technologies: ${project.technologies}`, margin, yPosition);
              yPosition += 4;
            }
            
            // URL
            if (project.url) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 255); // Blue for URL
              doc.text(project.url, margin, yPosition);
              doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]); // Reset color
              yPosition += 4;
            }
            
            // Description
            if (project.description) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const descLines = doc.splitTextToSize(project.description, contentWidth - 8);
              checkPageBreak(descLines.length * 4 + 2);
              doc.text(descLines, margin + 8, yPosition);
              yPosition += descLines.length * 4;
            }
            
            if (index < validProjects.length - 1) {
              yPosition += 8;
            }
          });
        }
      }

      if (section.type === 'awards') {
        const validAwards = (section.data as Award[]).filter(award => award.title && award.issuer);
        if (validAwards.length > 0) {
          addSectionHeader('Awards & Achievements');
          
          validAwards.forEach((award, index) => {
            checkPageBreak(15);
            
            // Award title - bold
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.text(award.title, margin, yPosition);
            
            // Date (right aligned)
            if (award.date) {
              const awardDate = new Date(award.date + '-01');
              const dateText = awardDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += 4;
            
            // Issuer - italic
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(award.issuer, margin, yPosition);
            yPosition += 4;
            
            // Description
            if (award.description) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const descLines = doc.splitTextToSize(award.description, contentWidth - 8);
              checkPageBreak(descLines.length * 4 + 2);
              doc.text(descLines, margin + 8, yPosition);
              yPosition += descLines.length * 4;
            }
            
            if (index < validAwards.length - 1) {
              yPosition += 6;
            }
          });
        }
      }

      if (section.type === 'volunteer') {
        const validVolunteer = (section.data as VolunteerExperience[]).filter(vol => vol.organization && vol.role);
        if (validVolunteer.length > 0) {
          addSectionHeader('Volunteer Experience');
          
          validVolunteer.forEach((vol, index) => {
            checkPageBreak(20);
            
            // Role - bold
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.text(vol.role, margin, yPosition);
            
            // Date range (right aligned)
            let dateText = '';
            if (vol.startDate && vol.endDate && vol.endDate !== 'present') {
              const startDate = new Date(vol.startDate + '-01');
              const endDate = new Date(vol.endDate + '-01');
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              dateText = `${startMonth} - ${endMonth}`;
            } else if (vol.startDate) {
              const startDate = new Date(vol.startDate + '-01');
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              dateText = `${startMonth} - Present`;
            }
            
            if (dateText) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += 4;
            
            // Organization - italic
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            let orgText = vol.organization;
            if (vol.location) {
              orgText += `, ${vol.location}`;
            }
            doc.text(orgText, margin, yPosition);
            yPosition += 4;
            
            // Description
            if (vol.description) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const descLines = doc.splitTextToSize(vol.description, contentWidth - 8);
              checkPageBreak(descLines.length * 4 + 2);
              doc.text(descLines, margin + 8, yPosition);
              yPosition += descLines.length * 4;
            }
            
            if (index < validVolunteer.length - 1) {
              yPosition += 8;
            }
          });
        }
      }
    });
    
    // Return blob for database storage or save file for download
    if (returnBlob) {
      return doc.output('blob');
    } else {
      // Use provided filename or generate a consistent one
      const fullName = `${personalInfo.firstName || ''}_${personalInfo.lastName || ''}`.replace(/\s+/g, '_') || 'Resume';
      const defaultFileName = `${fullName}_Resume.pdf`;
      const fileName = filename || defaultFileName;
      doc.save(fileName);
      return undefined;
    }
  };

  const handleSaveResume = async () => {
    setIsSaving(true);
    setShowGeneratingModal(true);
    setGenerationStep('generating');
    
    try {
      const cleanedData: ResumeData = {
        ...resumeData,
        experience: resumeData.experience.filter(exp => exp.company || exp.position),
        skills: resumeData.skills.filter(skill => skill.trim() !== ''),
        certifications: resumeData.certifications.filter(cert => cert.trim() !== '')
      };
      
      // Update parent state
      if (onResumeDataChange) {
        onResumeDataChange(cleanedData);
      }
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate PDF blob for database storage (without downloading)
      const pdfBlob = generatePDF(undefined, true) as Blob;
      
      // Convert blob to base64 for API transmission
      const pdfBase64 = await blobToBase64(pdfBlob);
      
      // Save to database via API
      await saveResumeToDatabase(cleanedData, pdfBase64);
      
      // Show success message
      setGenerationStep('success');
      
      // Set PDF ready state immediately after success
      setIsPDFReady(true);
      setHasUnsavedChanges(false);
      setHasExistingResume(true);
      
    } catch (error) {
      console.error('Error saving resume:', error);
      setShowGeneratingModal(false);
      alert('Error saving resume. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSection = (section: string) => {
    setEditingSection(section);
  };

  const handleSaveSection = () => {
    // Update parent state only (no localStorage)
    const cleanedData: ResumeData = {
      ...resumeData,
      experience: resumeData.experience.filter(exp => exp.company || exp.position),
      skills: resumeData.skills.filter(skill => skill.trim() !== ''),
      certifications: resumeData.certifications.filter(cert => cert.trim() !== '')
    };
    
    if (onResumeDataChange) {
      onResumeDataChange(cleanedData);
    }
    
    setEditingSection(null);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
  };

  const handleBackToForm = () => {
    setIsResumeGenerated(false);
    setEditingSection(null);
  };

  const handleDownloadPDF = () => {
    generatePDF();
  };

  const handleCloseModal = () => {
    setShowGeneratingModal(false);
    setGenerationStep('generating');
    // Scroll to top to show the PDF ready banner
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Function to save resume to database
  const saveResumeToDatabase = async (resumeData: ResumeData, pdfBase64: string) => {
    try {
      // Get Firebase ID token instead of localStorage
      console.log('=== DEBUGGING FIREBASE AUTHENTICATION ===');
      console.log('Current Firebase user:', auth.currentUser);
      
      if (!auth.currentUser) {
        throw new Error('You must be logged in to save a resume. Please sign in first.');
      }
      
      const token = await auth.currentUser.getIdToken();
      console.log('Firebase token obtained:', !!token);
      console.log('Token length:', token?.length);
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Get location display names for the database
      const { regionName, provinceName, cityName, barangayName } = getLocationDisplayNames();
      
      
      // Create enhanced resume data with readable location names
      const enhancedResumeData = {
        ...resumeData,
        personalInfo: {
          ...resumeData.personalInfo,
          // Add readable location names for database storage
          regionName,
          provinceName,
          cityName,
          barangayName
        }
      };

      const response = await fetch('http://localhost:3001/api/resumes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeData: enhancedResumeData,
          pdfData: pdfBase64
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to save resume');
      }

      const result = await response.json();
      console.log('Resume saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving resume to database:', error);
      throw error;
    }
  };

  const clearResumeData = () => {
    const emptyData: ResumeData = {
      personalInfo: { firstName: '', lastName: '', email: '', phone: '', region: '', province: '', city: '', barangay: '', address: '', zipCode: '', age: '', birthday: '', photo: '' },
      summary: '',
      experience: [{ company: '', position: '', duration: '', description: '', location: '', startDate: '', endDate: '' }],
      education: [{ degree: '', school: '', location: '', startDate: '', endDate: '', description: '' }],
      skills: [''],
      certifications: [''],
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ]
    };
    setResumeData(emptyData);
    setHasExistingResume(false);
    setIsPDFReady(false);
    setHasUnsavedChanges(true);
    // Clear parent component data as well
    if (onResumeDataChange) {
      onResumeDataChange(emptyData);
    }
  };

  // Photo upload handler - now uses cloud storage
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB.');
        return;
      }
      
      try {
        // Show uploading state
        setPhotoUploading(true);
        
        // Upload to cloud storage (resume photo, not profile picture)
        const result = await jobseekerCloudService.uploadResumePhoto(file);
        
        if (result.success && result.data) {
          // Update with cloud URL
          updatePersonalInfo('photo', result.data.cloudUrl);
          setPhotoUploadSuccess(true);
          
          // Show success message briefly
          setTimeout(() => setPhotoUploadSuccess(false), 3000);
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Photo upload error:', error);
        alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setPhotoUploading(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    updatePersonalInfo('photo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  // Resume upload and parsing functions
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Please select a PDF file smaller than 10MB.');
        return;
      }
      
      console.log(`📄 PDF file info: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      try {
        setResumeUploading(true);
        
        // Upload and parse resume using apiService
        const result = await apiService.parseResume(file);
        console.log('📤 Resume parsing API response:', result);
        console.log('📤 Response data structure:', {
          success: result.success,
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          personalInfoKeys: result.data?.personalInfo ? Object.keys(result.data.personalInfo) : []
        });
        
        if (result.success && result.data) {
          // Auto-fill form with parsed data
          autoFillFormData(result.data);
          setResumeParseSuccess(true);
          
          // Show success message briefly
          setTimeout(() => setResumeParseSuccess(false), 5000);
        } else {
          throw new Error(result.error || 'Failed to parse resume data');
        }
        
      } catch (error) {
        console.error('Resume upload error:', error);
        alert(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setResumeUploading(false);
        // Clear file input
        if (resumeFileInputRef.current) {
          resumeFileInputRef.current.value = '';
        }
      }
    }
  };

  const autoFillFormData = (parsedData: any) => {
    console.log('🔍 Auto-filling form with parsed data:', parsedData);
    console.log('🔍 Data structure analysis:', {
      hasPersonalInfo: !!parsedData.personalInfo,
      personalInfoKeys: parsedData.personalInfo ? Object.keys(parsedData.personalInfo) : [],
      personalInfoValues: parsedData.personalInfo || {},
      hasEducation: !!parsedData.education,
      educationCount: parsedData.education ? parsedData.education.length : 0,
      educationSample: parsedData.education ? parsedData.education[0] : null
    });
    
    // Update personal info
    if (parsedData.personalInfo) {
      const personalInfo = parsedData.personalInfo;
      
      console.log('🔍 Personal info details:', {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        address: personalInfo.address
      });
      
      // Handle name parsing - try multiple approaches
      if (personalInfo.firstName && personalInfo.lastName) {
        console.log('✅ Using parsed firstName and lastName:', {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName
        });
        updatePersonalInfo('firstName', personalInfo.firstName);
        updatePersonalInfo('lastName', personalInfo.lastName);
      } else if (personalInfo.fullName) {
        console.log('🔄 Parsing fullName:', personalInfo.fullName);
        const nameParts = personalInfo.fullName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          updatePersonalInfo('firstName', nameParts[0]);
          updatePersonalInfo('lastName', nameParts.slice(1).join(' '));
          console.log('✅ Extracted from fullName:', {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ')
          });
        }
      } else if (personalInfo.name) {
        console.log('🔄 Parsing name field:', personalInfo.name);
        const nameParts = personalInfo.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          updatePersonalInfo('firstName', nameParts[0]);
          updatePersonalInfo('lastName', nameParts.slice(1).join(' '));
          console.log('✅ Extracted from name:', {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ')
          });
        }
      } else {
        console.log('❌ No name information found in parsed data');
      }
      
      if (personalInfo.email) {
        console.log('✅ Using parsed email:', personalInfo.email);
        updatePersonalInfo('email', personalInfo.email);
      }
      
      if (personalInfo.phone) {
        console.log('✅ Using parsed phone:', personalInfo.phone);
        updatePersonalInfo('phone', personalInfo.phone);
      }
      
      // Handle address - put the full parsed address in the address field
      // The user can manually select PSGC dropdowns, but we'll put the parsed address in the street address field
      if (personalInfo.address) {
        updatePersonalInfo('address', personalInfo.address);
        console.log('✅ Parsed address:', personalInfo.address);
        console.log('📝 Note: Please manually select Region, Province, City, and Barangay from the dropdowns above');
      }
    } else {
      console.log('❌ No personalInfo found in parsed data');
    }
    
    // Update summary
    if (parsedData.summary) {
      updateSummary(parsedData.summary);
    }
    
    // Update experience
    if (parsedData.experience && parsedData.experience.length > 0) {
      const validExperiences = parsedData.experience.filter((exp: any) => 
        exp.company || exp.position || exp.description
      );
      
      if (validExperiences.length > 0) {
        setResumeData(prev => ({
          ...prev,
          experience: validExperiences.map((exp: any) => ({
            company: exp.company || '',
            position: exp.position || '',
            duration: exp.duration || '',
            description: exp.description || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || ''
          }))
        }));
      }
    }
    
    // Update education
    if (parsedData.education && parsedData.education.length > 0) {
      console.log('Raw parsed education data:', parsedData.education);
      
      // Log each education entry in detail
      parsedData.education.forEach((edu: any, index: number) => {
        console.log(`Education Entry ${index + 1}:`, {
          degree: edu.degree,
          school: edu.school,
          location: edu.location,
          startDate: edu.startDate,
          endDate: edu.endDate,
          description: edu.description,
          raw: edu.raw || 'N/A'
        });
        console.log(`Entry ${index + 1} validation:`, {
          hasDegree: !!edu.degree,
          hasSchool: !!edu.school,
          degreeLength: edu.degree?.length || 0,
          schoolLength: edu.school?.length || 0
        });
      });
      
      const validEducations = parsedData.education.filter((edu: any) => 
        (edu.degree && edu.degree.trim().length > 0) || (edu.school && edu.school.trim().length > 0)
      );
      console.log('Valid education entries count:', validEducations.length);
      console.log('Valid education entries:', validEducations);
      
      if (validEducations.length > 0) {
        const mappedEducations = validEducations.map((edu: any) => ({
          degree: edu.degree || '',
          school: edu.school || '',
          location: edu.location || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          description: edu.description || ''
        }));
        
        console.log('Mapped education for form:', mappedEducations);
        
        setResumeData(prev => ({
          ...prev,
          education: mappedEducations
        }));
        console.log('Updated education in form - SUCCESS');
      } else {
        console.log('No valid education entries found');
      }
    } else {
      console.log('No education data in parsed result');
    }
    // Update skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      const validSkills = parsedData.skills.filter((skill: string) => skill.trim());
      if (validSkills.length > 0) {
        setResumeData(prev => ({
          ...prev,
          skills: validSkills
        }));
      }
    }
    
    // Update certifications
    if (parsedData.certifications && parsedData.certifications.length > 0) {
      const validCertifications = parsedData.certifications.filter((cert: string) => cert.trim());
      if (validCertifications.length > 0) {
        setResumeData(prev => ({
          ...prev,
          certifications: validCertifications
        }));
      }
    }
    
    setHasUnsavedChanges(true);
  };

  const triggerResumeUpload = () => {
    resumeFileInputRef.current?.click();
  };

  const handleClearAllFields = () => {
    if (window.confirm('Are you sure you want to clear all fields? This action cannot be undone.')) {
      clearResumeData();
      // Also clear any success states
      setResumeParseSuccess(false);
      setPhotoUploadSuccess(false);
      setIsPDFReady(false);
      setIsResumeGenerated(false);
      console.log('All fields cleared by user');
    }
  };

  return (
    <div className={dashboardStyles.tabContent}>
      <div className={styles.contentWrapper}>
      
      {/* Generation Modal */}
      {showGeneratingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              onClick={handleCloseModal}
              className={styles.modalCloseButton}
            >
              <FiX />
            </button>
            <div className={styles.modalIcon}>
              {generationStep === 'generating' ? (
                <div className={styles.spinner}></div>
              ) : (
                <div className={styles.successIcon}>✓</div>
              )}
            </div>
            <h3 className={styles.modalTitle}>
              {generationStep === 'generating' ? 'Generating Resume' : 'Successfully Generated!'}
            </h3>
            <p className={styles.modalMessage}>
              {generationStep === 'generating' 
                ? 'Please wait while we prepare your resume...' 
                : 'Your resume has been generated successfully!'
              }
            </p>
            {generationStep === 'success' && (
              <div className={styles.modalActions}>
                <button 
                  onClick={handleDownloadPDF}
                  className={styles.modalDownloadButton}
                >
                  <FiDownload /> Download PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      
      {/* Download PDF Section - Show when PDF is ready */}
      {isPDFReady && (
        <div className={styles.pdfReadyBanner}>
          <div className={styles.pdfReadyContent}>
            <div className={styles.pdfReadyMessage}>
              <FiDownload className={styles.pdfReadyIcon} />
              <span>Your resume is ready for download! Use the Download Resume PDF button below.</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Resume Upload Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadHeader}>
          <h3 className={styles.uploadTitle}>Quick Start: Upload Your Resume</h3>
          <p className={styles.uploadDescription}>
            Upload your existing resume (PDF) to automatically fill out the form fields below
          </p>
        </div>
        
        <input
          type="file"
          ref={resumeFileInputRef}
          onChange={handleResumeUpload}
          accept="application/pdf"
          style={{ display: 'none' }}
        />
        
        <button
          onClick={triggerResumeUpload}
          className={styles.uploadButton}
          disabled={resumeUploading}
        >
          {resumeUploading ? (
            <>
              <div className={styles.spinner} />
              <span>Parsing Resume...</span>
            </>
          ) : (
            <>
              <FiUpload className={styles.uploadIcon} />
              <span>Upload Resume (PDF)</span>
            </>
          )}
        </button>
        
        {/* Resume Parse Success Message */}
        {resumeParseSuccess && (
          <div className={styles.parseSuccessMessage}>
            <FiCheck className={styles.successIcon} />
            <div>
              <div><strong>Resume parsed successfully!</strong></div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>
                ✓ Check the browser console (F12) for detailed parsing information<br/>
                ✓ For address: Please manually select Region, Province, City, Barangay from dropdowns<br/>
                ✓ Review and adjust the auto-filled information as needed
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <FiUser className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Personal Information</h2>
        </div>
      
      {/* Photo and Name Section */}
      <div className={styles.photoAndNameSection}>
        {/* Photo Upload */}
        <div className={styles.photoUploadContainer}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {resumeData.personalInfo.photo ? (
            <div className={styles.photoPreview}>
              <img 
                src={jobseekerCloudService.getOptimizedImageUrl(resumeData.personalInfo.photo, { width: 150, height: 150 })} 
                alt="Profile" 
                className={styles.photoImage}
              />
              <div className={styles.photoOverlay}>
                <button 
                  onClick={triggerPhotoUpload}
                  className={styles.photoChangeButton}
                  disabled={photoUploading}
                >
                  {photoUploading ? <div className={styles.spinner} /> : <FiUpload />} 
                  {photoUploading ? 'Uploading...' : 'Change'}
                </button>
                <button 
                  onClick={handleRemovePhoto}
                  className={styles.photoRemoveButton}
                >
                  <FiX /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.photoPlaceholder} onClick={triggerPhotoUpload}>
              {photoUploading ? (
                <>
                  <div className={styles.spinner} />
                  <span className={styles.photoPlaceholderText}>Uploading...</span>
                </>
              ) : (
                <>
                  <FiUpload className={styles.photoPlaceholderIcon} />
                  <span className={styles.photoPlaceholderText}>Add photo</span>
                  <span className={styles.photoPlaceholderSubtext}>(optional)</span>
                </>
              )}
            </div>
          )}
          
          {/* Photo Upload Success Message */}
          {photoUploadSuccess && (
            <div className={styles.photoSuccessMessage}>
              <FiCheck className={styles.successIcon} />
              Photo uploaded successfully!
            </div>
          )}
        </div>
        
        {/* Name and Contact Fields */}
        <div className={styles.nameAndContactContainer}>
          {/* Name Fields */}
          <div className={styles.nameFieldsContainer}>
            <div className={styles.formGroup}>
              <label>
                First Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={resumeData.personalInfo.firstName}
                onChange={(e) => updatePersonalInfo('firstName', capitalizeWords(e.target.value))}
                placeholder="Enter your first name"
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                Last Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={resumeData.personalInfo.lastName}
                onChange={(e) => updatePersonalInfo('lastName', capitalizeWords(e.target.value))}
                placeholder="Enter your last name"
                className={styles.formInput}
              />
            </div>
          </div>
          
          {/* Contact Fields */}
          <div className={styles.contactFieldsContainer}>
            <div className={styles.formGroup}>
              <label>
                Email Address <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                value={resumeData.personalInfo.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="example@email.com"
                className={`${styles.formInput} ${resumeData.personalInfo.email && !isValidEmail(resumeData.personalInfo.email) ? styles.inputError : ''}`}
              />
              {resumeData.personalInfo.email && !isValidEmail(resumeData.personalInfo.email) && (
                <span className={styles.errorText}>Please enter a valid email address</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>
                Phone Number <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                value={resumeData.personalInfo.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="0XXX-XXX-XXXX"
                className={`${styles.formInput} ${resumeData.personalInfo.phone && !isValidPhoneNumber(resumeData.personalInfo.phone) ? styles.inputError : ''}`}
              />
              {resumeData.personalInfo.phone && !isValidPhoneNumber(resumeData.personalInfo.phone) && (
                <span className={styles.errorText}>Please enter a valid Philippine phone number</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>
            Region ({regions.length} available) <span className={styles.required}>*</span>
          </label>
          <select
            value={resumeData.personalInfo.region}
            onChange={(e) => handleRegionChange(e.target.value)}
            className={styles.formInput}
          >
            <option value="">Select Region</option>
            {regions && regions.length > 0 ? (
              regions.map((region, index) => {
                const regionCode = region.reg_code || region.regCode;
                const regionName = region.name || region.regDesc;
                return (
                  <option key={regionCode || index} value={regionCode}>
                    {regionName || `Region ${index}`}
                  </option>
                );
              })
            ) : (
              <option disabled>No regions available</option>
            )}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>
            Province ({provinces.length} available) <span className={styles.required}>*</span>
          </label>
          <select
            value={resumeData.personalInfo.province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className={styles.formInput}
            disabled={!resumeData.personalInfo.region}
          >
            <option value="">Select Province</option>
            {provinces && provinces.length > 0 ? (
              provinces.map((province, index) => {
                const provinceCode = province.prv_code || province.prov_code || province.provCode;
                const provinceName = province.name || province.provDesc;
                return (
                  <option key={provinceCode || index} value={provinceCode}>
                    {provinceName || `Province ${index}`}
                  </option>
                );
              })
            ) : (
              <option disabled>No provinces available</option>
            )}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>
            City/Municipality ({cities.length} available) <span className={styles.required}>*</span>
          </label>
          <select
            value={resumeData.personalInfo.city}
            onChange={(e) => handleCityChange(e.target.value)}
            className={styles.formInput}
            disabled={!resumeData.personalInfo.province}
          >
            <option value="">Select City/Municipality</option>
            {cities && cities.length > 0 ? (
              cities.map((city, index) => {
                const cityCode = city.mun_code || city.citymunCode;
                const cityName = city.name || city.citymunDesc;
                return (
                  <option key={cityCode || index} value={cityCode}>
                    {cityName || `City ${index}`}
                  </option>
                );
              })
            ) : (
              <option disabled>No cities available</option>
            )}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>
            Barangay ({barangays.length} available) <span className={styles.required}>*</span>
          </label>
          <select
            value={resumeData.personalInfo.barangay}
            onChange={(e) => handleBarangayChange(e.target.value)}
            className={styles.formInput}
            disabled={!resumeData.personalInfo.city}
          >
            <option value="">Select Barangay</option>
            {barangays && barangays.length > 0 ? (
              barangays.map((barangay, index) => {
                const barangayCode = barangay.bgy_code || barangay.brgy_code || barangay.brgyCode;
                const barangayName = barangay.name || barangay.brgyDesc;
                
                
                return (
                  <option key={barangayCode || index} value={barangayCode || barangayName}>
                    {barangayName || `Barangay ${index}`}
                  </option>
                );
              })
            ) : (
              <option disabled>No barangays available</option>
            )}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>
            Street Address <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={resumeData.personalInfo.address}
            onChange={(e) => updatePersonalInfo('address', e.target.value)}
            className={styles.formInput}
            placeholder="123 Rizal Street"
          />
        </div>
        <div className={styles.formGroup}>
          <label>
            Zip Code <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={resumeData.personalInfo.zipCode}
            onChange={(e) => updatePersonalInfo('zipCode', e.target.value)}
            className={styles.formInput}
            placeholder="1000"
          />
        </div>
        <div className={styles.formGroup}>
          <label>
            Birthday <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={resumeData.personalInfo.birthday}
            onChange={(e) => handleBirthdayChange(e.target.value)}
            className={styles.formInput}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className={styles.formGroup}>
          <label>
            Age <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            value={resumeData.personalInfo.age}
            className={styles.formInput}
            placeholder="Auto-calculated"
            readOnly
          />
        </div>
      </div>
      </div>

      {/* Dynamic Section Rendering */}
      {(() => {
        console.log('🔍 Debug sectionOrder:', resumeData.sectionOrder);
        return null;
      })()}
      {resumeData.sectionOrder && resumeData.sectionOrder.length > 1 ? resumeData.sectionOrder.slice(1).map((section, index) => {
        const sectionIndex = index + 1; // Adjust for skipping personal info
        console.log('🔍 Debug rendering section:', section);
        
        if (section.type === 'summary') {
          return (
            <div key={section.id} className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <FiFileText className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Professional Summary</h2>
                {renderSectionControls(sectionIndex)}
              </div>
              <div className={styles.formGroup}>
                <label>Summary</label>
                <textarea
                  value={resumeData.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  placeholder="Write a brief professional summary about yourself..."
                  className={styles.formTextarea}
                />
              </div>
            </div>
          );
        }
        
        if (section.type === 'experience') {
          return (
            <div key={section.id} className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <FiBriefcase className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Work Experience</h2>
                {renderSectionControls(sectionIndex)}
              </div>
              {resumeData.experience.map((exp, expIndex) => (
                <div key={expIndex} className={styles.itemContainer}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>Experience {expIndex + 1}</h3>
                    {resumeData.experience.length > 1 && (
                      <button 
                        onClick={() => removeExperience(expIndex)}
                        className={styles.removeButton}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Job title</label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={(e) => updateExperience(expIndex, 'position', e.target.value)}
                        placeholder="Junior Accountant"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Employer</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                        placeholder="Company name"
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Location</label>
                      <input
                        type="text"
                        value={exp.location || ''}
                        onChange={(e) => updateExperience(expIndex, 'location', e.target.value)}
                        placeholder="Makati City, Metro Manila, Philippines"
                        className={styles.formInput}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className={styles.formGroup} style={{ flex: '1' }}>
                        <label>Start date <span className={styles.required}>*</span></label>
                        <input
                          type="month"
                          value={exp.startDate || ''}
                          onChange={(e) => updateExperience(expIndex, 'startDate', e.target.value)}
                          className={`${styles.formInput} ${getExperienceValidationError(expIndex) ? styles.inputError : ''}`}
                          style={{ width: '100%' }}
                          title="Select month and year (MM/YYYY format)"
                          max={new Date().toISOString().slice(0, 7)}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: '1' }}>
                        <label>End date</label>
                        <div className={styles.dateInputContainer}>
                          <input
                            type="month"
                            value={exp.endDate === 'present' ? '' : (exp.endDate || '')}
                            onChange={(e) => updateExperience(expIndex, 'endDate', e.target.value)}
                            className={`${styles.formInput} ${getExperienceValidationError(expIndex) ? styles.inputError : ''}`}
                            style={{ width: '100%' }}
                            title="Select month and year (MM/YYYY format)"
                            max={new Date().toISOString().slice(0, 7)}
                            disabled={exp.endDate === 'present'}
                          />
                          <label className={styles.presentCheckbox}>
                            <input
                              type="checkbox"
                              checked={exp.endDate === 'present'}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  updateExperience(expIndex, 'endDate', 'present');
                                } else {
                                  updateExperience(expIndex, 'endDate', '');
                                }
                              }}
                            />
                            <span>Currently working here</span>
                          </label>
                          {getExperienceValidationError(expIndex) && (
                            <div className={styles.errorText}>
                              {getExperienceValidationError(expIndex)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(expIndex, 'description', e.target.value)}
                      placeholder="Describe your responsibilities and achievements..."
                      className={styles.formTextarea}
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addExperience}
                className={styles.addButton}
              >
                <FiPlus /> Add Experience
              </button>
            </div>
          );
        }
        
        if (section.type === 'education') {
          return (
            <div key={section.id} className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <FiFileText className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Educational Background</h2>
                {renderSectionControls(sectionIndex)}
              </div>
              {resumeData.education.map((edu, eduIndex) => (
                <div key={eduIndex} className={styles.itemContainer}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>Education {eduIndex + 1}</h3>
                    {resumeData.education.length > 1 && (
                      <button 
                        onClick={() => removeEducation(eduIndex)}
                        className={styles.removeButton}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>School name</label>
                      <input
                        type="text"
                        value={edu.school}
                        onChange={(e) => updateEducation(eduIndex, 'school', e.target.value)}
                        placeholder="De La Salle University"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Location</label>
                      <input
                        type="text"
                        value={edu.location}
                        onChange={(e) => updateEducation(eduIndex, 'location', e.target.value)}
                        placeholder="Manila, Philippines"
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Degree</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(eduIndex, 'degree', e.target.value)}
                        placeholder="Bachelor of Science in Computer Science"
                        className={styles.formInput}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className={styles.formGroup} style={{ flex: '1' }}>
                        <label>Start year</label>
                        <YearPicker
                          value={edu.startDate ? new Date(edu.startDate + '-01').getFullYear().toString() : ''}
                          onChange={(year) => {
                            if (year) {
                              updateEducation(eduIndex, 'startDate', `${year}-01`);
                            } else {
                              updateEducation(eduIndex, 'startDate', '');
                            }
                          }}
                          minYear={1950}
                          maxYear={new Date().getFullYear()}
                          placeholder="Select start year"
                          className={getEducationValidationError(eduIndex) ? styles.inputError : ''}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: '1' }}>
                        <label>End year</label>
                        <div className={styles.dateInputContainer}>
                          <YearPicker
                            value={edu.endDate === 'present' ? '' : (edu.endDate ? new Date(edu.endDate + '-01').getFullYear().toString() : '')}
                            onChange={(year) => {
                              if (year) {
                                updateEducation(eduIndex, 'endDate', `${year}-01`);
                              } else {
                                updateEducation(eduIndex, 'endDate', '');
                              }
                            }}
                            minYear={1950}
                            maxYear={new Date().getFullYear() + 10}
                            placeholder="Select end year"
                            disabled={edu.endDate === 'present'}
                            className={getEducationValidationError(eduIndex) ? styles.inputError : ''}
                          />
                          <label className={styles.presentCheckbox}>
                            <input
                              type="checkbox"
                              checked={edu.endDate === 'present'}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  updateEducation(eduIndex, 'endDate', 'present');
                                } else {
                                  updateEducation(eduIndex, 'endDate', '');
                                }
                              }}
                            />
                            <span>Currently studying here</span>
                          </label>
                          {getEducationValidationError(eduIndex) && (
                            <div className={styles.errorText}>
                              {getEducationValidationError(eduIndex)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={edu.description}
                      onChange={(e) => updateEducation(eduIndex, 'description', e.target.value)}
                      placeholder="GPA, honors, relevant coursework, achievements..."
                      className={styles.formTextarea}
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addEducation}
                className={styles.addButton}
              >
                <FiPlus /> Add Education
              </button>
            </div>
          );
        }
        
        if (section.type === 'skills') {
          return (
            <div key={section.id} className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <FiStar className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Skills</h2>
                {renderSectionControls(sectionIndex)}
              </div>
              <div className={styles.skillsList}>
                {resumeData.skills.map((skill, skillIndex) => (
                  <div key={skillIndex} className={styles.skillItem}>
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => updateSkill(skillIndex, e.target.value)}
                      placeholder="Enter a skill"
                      className={styles.formInput}
                    />
                    {resumeData.skills.length > 1 && (
                      <button 
                        onClick={() => removeSkill(skillIndex)}
                        className={styles.removeButton}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button 
                onClick={addSkill}
                className={styles.addButton}
              >
                <FiPlus /> Add Skill
              </button>
            </div>
          );
        }
        
        // Handle optional sections
        if (section.type === 'optional') {
          const optionalSection = resumeData.optionalSections.find(opt => opt.id === section.id);
          if (!optionalSection) return null;
          
          return (
            <div key={section.id} className={styles.sectionContainer}>
              <div className={styles.sectionOrderControls}>
                <div className={styles.sectionHeader}>
                  {optionalSection.type === 'certificates' && <FiStar className={styles.sectionIcon} />}
                  {optionalSection.type === 'projects' && <FiFileText className={styles.sectionIcon} />}
                  {optionalSection.type === 'awards' && <FiStar className={styles.sectionIcon} />}
                  {optionalSection.type === 'volunteer' && <FiUser className={styles.sectionIcon} />}
                  <h2 className={styles.sectionTitle}>{optionalSection.title}</h2>
                  <div className={styles.sectionControls}>
                    {renderSectionControls(sectionIndex)}
                    <button
                      onClick={() => removeOptionalSection(optionalSection.id)}
                      className={styles.removeButton}
                      title="Remove section"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Certificates Section */}
              {optionalSection.type === 'certificates' && (
                <>
                  {(optionalSection.data as Certificate[]).map((cert, index) => (
                    <div key={index} className={styles.itemContainer}>
                      <div className={styles.itemHeader}>
                        <h3 className={styles.itemTitle}>Certificate {index + 1}</h3>
                        {(optionalSection.data as Certificate[]).length > 1 && (
                          <button 
                            onClick={() => removeCertificate(optionalSection.id, index)}
                            className={styles.removeButton}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Certificate Name</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => updateCertificate(optionalSection.id, index, 'name', e.target.value)}
                            placeholder="AWS Certified Solutions Architect"
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Issuing Organization</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => updateCertificate(optionalSection.id, index, 'issuer', e.target.value)}
                            placeholder="Amazon Web Services"
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date Obtained</label>
                        <input
                          type="month"
                          value={cert.date}
                          onChange={(e) => updateCertificate(optionalSection.id, index, 'date', e.target.value)}
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                          value={cert.description}
                          onChange={(e) => updateCertificate(optionalSection.id, index, 'description', e.target.value)}
                          placeholder="Brief description of the certification and its relevance..."
                          className={styles.formTextarea}
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addCertificate(optionalSection.id)}
                    className={styles.addButton}
                  >
                    <FiPlus /> Add Certificate
                  </button>
                </>
              )}

              {/* Projects Section */}
              {optionalSection.type === 'projects' && (
                <>
                  {(optionalSection.data as Project[]).map((project, index) => (
                    <div key={index} className={styles.itemContainer}>
                      <div className={styles.itemHeader}>
                        <h3 className={styles.itemTitle}>Project {index + 1}</h3>
                        {(optionalSection.data as Project[]).length > 1 && (
                          <button 
                            onClick={() => removeProject(optionalSection.id, index)}
                            className={styles.removeButton}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Project Name</label>
                          <input
                            type="text"
                            value={project.name}
                            onChange={(e) => updateProject(optionalSection.id, index, 'name', e.target.value)}
                            placeholder="E-commerce Website"
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Technologies Used</label>
                          <input
                            type="text"
                            value={project.technologies}
                            onChange={(e) => updateProject(optionalSection.id, index, 'technologies', e.target.value)}
                            placeholder="React, Node.js, MongoDB"
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Start Date</label>
                          <input
                            type="month"
                            value={project.startDate}
                            onChange={(e) => updateProject(optionalSection.id, index, 'startDate', e.target.value)}
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>End Date</label>
                          <input
                            type="month"
                            value={project.endDate}
                            onChange={(e) => updateProject(optionalSection.id, index, 'endDate', e.target.value)}
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Project URL (Optional)</label>
                        <input
                          type="url"
                          value={project.url || ''}
                          onChange={(e) => updateProject(optionalSection.id, index, 'url', e.target.value)}
                          placeholder="https://github.com/username/project"
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                          value={project.description}
                          onChange={(e) => updateProject(optionalSection.id, index, 'description', e.target.value)}
                          placeholder="Describe the project, your role, and key achievements..."
                          className={styles.formTextarea}
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addProject(optionalSection.id)}
                    className={styles.addButton}
                  >
                    <FiPlus /> Add Project
                  </button>
                </>
              )}

              {/* Awards Section */}
              {optionalSection.type === 'awards' && (
                <>
                  {(optionalSection.data as Award[]).map((award, index) => (
                    <div key={index} className={styles.itemContainer}>
                      <div className={styles.itemHeader}>
                        <h3 className={styles.itemTitle}>Award {index + 1}</h3>
                        {(optionalSection.data as Award[]).length > 1 && (
                          <button 
                            onClick={() => removeAward(optionalSection.id, index)}
                            className={styles.removeButton}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Award Title</label>
                          <input
                            type="text"
                            value={award.title}
                            onChange={(e) => updateAward(optionalSection.id, index, 'title', e.target.value)}
                            placeholder="Employee of the Month"
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Issuing Organization</label>
                          <input
                            type="text"
                            value={award.issuer}
                            onChange={(e) => updateAward(optionalSection.id, index, 'issuer', e.target.value)}
                            placeholder="ABC Company"
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date Received</label>
                        <input
                          type="month"
                          value={award.date}
                          onChange={(e) => updateAward(optionalSection.id, index, 'date', e.target.value)}
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                          value={award.description}
                          onChange={(e) => updateAward(optionalSection.id, index, 'description', e.target.value)}
                          placeholder="Description of the achievement and its significance..."
                          className={styles.formTextarea}
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addAward(optionalSection.id)}
                    className={styles.addButton}
                  >
                    <FiPlus /> Add Award
                  </button>
                </>
              )}

              {/* Volunteer Experience Section */}
              {optionalSection.type === 'volunteer' && (
                <>
                  {(optionalSection.data as VolunteerExperience[]).map((vol, index) => (
                    <div key={index} className={styles.itemContainer}>
                      <div className={styles.itemHeader}>
                        <h3 className={styles.itemTitle}>Volunteer Experience {index + 1}</h3>
                        {(optionalSection.data as VolunteerExperience[]).length > 1 && (
                          <button 
                            onClick={() => removeVolunteerExperience(optionalSection.id, index)}
                            className={styles.removeButton}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Organization</label>
                          <input
                            type="text"
                            value={vol.organization}
                            onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'organization', e.target.value)}
                            placeholder="Red Cross"
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Role</label>
                          <input
                            type="text"
                            value={vol.role}
                            onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'role', e.target.value)}
                            placeholder="Volunteer Coordinator"
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Location</label>
                          <input
                            type="text"
                            value={vol.location}
                            onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'location', e.target.value)}
                            placeholder="Manila, Philippines"
                            className={styles.formInput}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <div className={styles.formGroup} style={{ flex: '1' }}>
                            <label>Start Date</label>
                            <input
                              type="month"
                              value={vol.startDate}
                              onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'startDate', e.target.value)}
                              className={styles.formInput}
                            />
                          </div>
                          <div className={styles.formGroup} style={{ flex: '1' }}>
                            <label>End Date</label>
                            <input
                              type="month"
                              value={vol.endDate === 'present' ? '' : vol.endDate}
                              onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'endDate', e.target.value)}
                              className={styles.formInput}
                              disabled={vol.endDate === 'present'}
                            />
                            <label className={styles.presentCheckbox}>
                              <input
                                type="checkbox"
                                checked={vol.endDate === 'present'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateVolunteerExperience(optionalSection.id, index, 'endDate', 'present');
                                  } else {
                                    updateVolunteerExperience(optionalSection.id, index, 'endDate', '');
                                  }
                                }}
                              />
                              <span>Currently volunteering here</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                          value={vol.description}
                          onChange={(e) => updateVolunteerExperience(optionalSection.id, index, 'description', e.target.value)}
                          placeholder="Describe your volunteer activities and impact..."
                          className={styles.formTextarea}
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addVolunteerExperience(optionalSection.id)}
                    className={styles.addButton}
                  >
                    <FiPlus /> Add Volunteer Experience
                  </button>
                </>
              )}
            </div>
          );
        }
        
        return null;
      }) : (
        // Fallback: render sections in traditional way if sectionOrder is not available
        <>
          {/* Professional Summary */}
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <FiFileText className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Professional Summary</h2>
            </div>
            <div className={styles.formGroup}>
              <label>Summary</label>
              <textarea
                value={resumeData.summary}
                onChange={(e) => updateSummary(e.target.value)}
                placeholder="Write a brief professional summary about yourself..."
                className={styles.formTextarea}
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <FiBriefcase className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Work Experience</h2>
            </div>
            {resumeData.experience.map((exp, index) => (
              <div key={index} className={styles.itemContainer}>
                <div className={styles.itemHeader}>
                  <h3 className={styles.itemTitle}>Experience {index + 1}</h3>
                  {resumeData.experience.length > 1 && (
                    <button 
                      onClick={() => removeExperience(index)}
                      className={styles.removeButton}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Job title</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => updateExperience(index, 'position', e.target.value)}
                      placeholder="Junior Accountant"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Employer</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      placeholder="Company name"
                      className={styles.formInput}
                    />
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Location</label>
                    <input
                      type="text"
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(index, 'location', e.target.value)}
                      placeholder="Makati City, Metro Manila, Philippines"
                      className={styles.formInput}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className={styles.formGroup} style={{ flex: '1' }}>
                      <label>Start date <span className={styles.required}>*</span></label>
                      <input
                        type="month"
                        value={exp.startDate || ''}
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        className={`${styles.formInput} ${getExperienceValidationError(index) ? styles.inputError : ''}`}
                        style={{ width: '100%' }}
                        title="Select month and year (MM/YYYY format)"
                        max={new Date().toISOString().slice(0, 7)}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ flex: '1' }}>
                      <label>End date</label>
                      <div className={styles.dateInputContainer}>
                        <input
                          type="month"
                          value={exp.endDate === 'present' ? '' : (exp.endDate || '')}
                          onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                          className={`${styles.formInput} ${getExperienceValidationError(index) ? styles.inputError : ''}`}
                          style={{ width: '100%' }}
                          title="Select month and year (MM/YYYY format)"
                          max={new Date().toISOString().slice(0, 7)}
                          disabled={exp.endDate === 'present'}
                        />
                        <label className={styles.presentCheckbox}>
                          <input
                            type="checkbox"
                            checked={exp.endDate === 'present'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateExperience(index, 'endDate', 'present');
                              } else {
                                updateExperience(index, 'endDate', '');
                              }
                            }}
                          />
                          <span>Currently working here</span>
                        </label>
                        {getExperienceValidationError(index) && (
                          <div className={styles.errorText}>
                            {getExperienceValidationError(index)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => updateExperience(index, 'description', e.target.value)}
                    placeholder="Describe your responsibilities and achievements..."
                    className={styles.formTextarea}
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={addExperience}
              className={styles.addButton}
            >
              <FiPlus /> Add Experience
            </button>
          </div>

          {/* Educational Background */}
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <FiFileText className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Educational Background</h2>
            </div>
            {resumeData.education.map((edu, index) => (
              <div key={index} className={styles.itemContainer}>
                <div className={styles.itemHeader}>
                  <h3 className={styles.itemTitle}>Education {index + 1}</h3>
                  {resumeData.education.length > 1 && (
                    <button 
                      onClick={() => removeEducation(index)}
                      className={styles.removeButton}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>School name</label>
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => updateEducation(index, 'school', e.target.value)}
                      placeholder="De La Salle University"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Location</label>
                    <input
                      type="text"
                      value={edu.location}
                      onChange={(e) => updateEducation(index, 'location', e.target.value)}
                      placeholder="Manila, Philippines"
                      className={styles.formInput}
                    />
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      placeholder="Bachelor of Science in Computer Science"
                      className={styles.formInput}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className={styles.formGroup} style={{ flex: '1' }}>
                      <label>Start year</label>
                      <YearPicker
                        value={edu.startDate ? new Date(edu.startDate + '-01').getFullYear().toString() : ''}
                        onChange={(year) => {
                          if (year) {
                            updateEducation(index, 'startDate', `${year}-01`);
                          } else {
                            updateEducation(index, 'startDate', '');
                          }
                        }}
                        minYear={1950}
                        maxYear={new Date().getFullYear()}
                        placeholder="Select start year"
                        className={getEducationValidationError(index) ? styles.inputError : ''}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ flex: '1' }}>
                      <label>End year</label>
                      <div className={styles.dateInputContainer}>
                        <YearPicker
                          value={edu.endDate === 'present' ? '' : (edu.endDate ? new Date(edu.endDate + '-01').getFullYear().toString() : '')}
                          onChange={(year) => {
                            if (year) {
                              updateEducation(index, 'endDate', `${year}-01`);
                            } else {
                              updateEducation(index, 'endDate', '');
                            }
                          }}
                          minYear={1950}
                          maxYear={new Date().getFullYear() + 10}
                          placeholder="Select end year"
                          disabled={edu.endDate === 'present'}
                          className={getEducationValidationError(index) ? styles.inputError : ''}
                        />
                        <label className={styles.presentCheckbox}>
                          <input
                            type="checkbox"
                            checked={edu.endDate === 'present'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateEducation(index, 'endDate', 'present');
                              } else {
                                updateEducation(index, 'endDate', '');
                              }
                            }}
                          />
                          <span>Currently studying here</span>
                        </label>
                        {getEducationValidationError(index) && (
                          <div className={styles.errorText}>
                            {getEducationValidationError(index)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={edu.description}
                    onChange={(e) => updateEducation(index, 'description', e.target.value)}
                    placeholder="GPA, honors, relevant coursework, achievements..."
                    className={styles.formTextarea}
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={addEducation}
              className={styles.addButton}
            >
              <FiPlus /> Add Education
            </button>
          </div>

          {/* Skills */}
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <FiStar className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Skills</h2>
            </div>
            <div className={styles.skillsList}>
              {resumeData.skills.map((skill, index) => (
                <div key={index} className={styles.skillItem}>
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    placeholder="Enter a skill"
                    className={styles.formInput}
                  />
                  {resumeData.skills.length > 1 && (
                    <button 
                      onClick={() => removeSkill(index)}
                      className={styles.removeButton}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={addSkill}
              className={styles.addButton}
            >
              <FiPlus /> Add Skill
            </button>
          </div>
        </>
      )}

      {/* Add Section Feature */}
      {getAvailableSectionTypes().length > 0 && (
        <div className={styles.addSectionContainer}>
          <div className={styles.sectionHeader}>
            <FiPlus className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Add Section</h2>
          </div>
          <div className={styles.addSectionDropdown}>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  addOptionalSection(e.target.value as 'certificates' | 'projects' | 'awards' | 'volunteer');
                  e.target.value = ''; // Reset dropdown
                }
              }}
              className={styles.formInput}
              defaultValue=""
            >
              <option value="" disabled>Choose a section to add...</option>
              {getAvailableSectionTypes().map(type => {
                const titles = {
                  certificates: 'Certificates & Seminars',
                  projects: 'Projects',
                  awards: 'Awards & Achievements',
                  volunteer: 'Volunteer Experience'
                };
                return (
                  <option key={type} value={type}>
                    {titles[type]}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionSection}>
        <button 
          onClick={handleSaveResume}
          disabled={isSaving || !isFormValid()}
          className={styles.saveButton}
        >
          <FiDownload className={styles.buttonIcon} />
          {isSaving ? 'Generating...' : 'Save & Generate Resume'}
        </button>
        
        <button 
          onClick={handleDownloadPDF}
          disabled={!isPDFReady || hasUnsavedChanges || !isFormValid()}
          className={`${styles.downloadButton} ${(!isPDFReady || hasUnsavedChanges || !isFormValid()) ? styles.disabledButton : ''}`}
        >
          <FiDownload className={styles.buttonIcon} />
          Download Resume PDF
        </button>
        
        <button 
          onClick={handleClearAllFields}
          className={styles.clearButton}
          title="Clear all form fields"
        >
          <FiTrash2 className={styles.buttonIcon} />
          Clear All Fields
        </button>
      </div>
      </div>
    </div>
  );
};

export default CreateResumeTab;
