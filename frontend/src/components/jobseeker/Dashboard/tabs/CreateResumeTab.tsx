import React, { useState, useEffect, useRef } from 'react';
import { FiDownload, FiSave, FiUser, FiBriefcase, FiFileText, FiPlus, FiMinus, FiEdit3, FiSave as FiSaveIcon, FiX, FiMail, FiPhone, FiMapPin, FiClock, FiCalendar, FiTrash2, FiStar, FiUpload, FiCheck, FiChevronUp, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
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
  type: 'certificates' | 'projects' | 'awards' | 'organizations';
  title: string;
  data: Certificate[] | Project[] | Award[] | Organization[];
}

interface Organization {
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
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

// Helper function to capitalize first letter of each word (proper title case)
const capitalizeWords = (str: string): string => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
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
  const [showToEmployers, setShowToEmployers] = useState(true); // Consent for employer visibility
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null); // Store original uploaded PDF
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState<string | null>(null); // Cloud URL of uploaded PDF
  const [showUploadedToEmployers, setShowUploadedToEmployers] = useState(false); // Show uploaded resume to employers
  const [showUploadConsentModal, setShowUploadConsentModal] = useState(false); // Show consent modal after upload
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null); // File waiting for consent
  const [showStickyButton, setShowStickyButton] = useState(false); // New state variable
  const [showInstructions, setShowInstructions] = useState(false); // Collapsible instructions

  // PSGC dropdown options
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  // Scroll listener for sticky button
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky button when scrolled down more than 400px
      setShowStickyButton(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Handle phone number formatting (Philippine format with +63 prefix)
  const handlePhoneChange = (phone: string) => {
    // Remove all non-digit characters except the + at the beginning
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +63, remove it for processing
    if (cleanPhone.startsWith('+63')) {
      cleanPhone = cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('63')) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    // Remove leading 0 if present (since we'll use +63 format)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Format based on length (Philippine mobile: 9XX-XXX-XXXX after +63)
    let formattedPhone = '+63 ';
    
    if (cleanPhone.length <= 3) {
      formattedPhone += cleanPhone;
    } else if (cleanPhone.length <= 6) {
      formattedPhone += `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`;
    } else if (cleanPhone.length <= 10) {
      formattedPhone += `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    } else {
      // Limit to 10 digits max (9XX-XXX-XXXX)
      const limitedDigits = cleanPhone.slice(0, 10);
      formattedPhone += `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
    
    updatePersonalInfo('phone', formattedPhone);
  };

  // Convert any phone number format to +63 format
  const convertToPhilippineFormat = (phone: string) => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let digitsOnly = phone.replace(/\D/g, '');
    
    // Handle different input formats
    if (digitsOnly.startsWith('63')) {
      // Already has country code, remove it
      digitsOnly = digitsOnly.substring(2);
    }
    
    if (digitsOnly.startsWith('0')) {
      // Remove leading 0
      digitsOnly = digitsOnly.substring(1);
    }
    
    // Ensure it's a valid Philippine mobile number (should start with 9)
    if (digitsOnly.length >= 10 && digitsOnly.startsWith('9')) {
      // Format as +63 9XX-XXX-XXXX
      const limitedDigits = digitsOnly.slice(0, 10);
      return `+63 ${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
    
    // If it doesn't look like a valid Philippine number, return original
    return phone;
  };

  // Validate Philippine phone number
  const isValidPhoneNumber = (phone: string) => {
    // Check if it starts with +63
    if (!phone.startsWith('+63 ')) {
      return false;
    }
    
    const digitsOnly = phone.replace(/\D/g, '');
    // Should be 13 digits total: 63 + 10 digits (9XX-XXX-XXXX)
    // Philippine mobile numbers start with 9 after country code
    return digitsOnly.length === 12 && digitsOnly.startsWith('639');
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
        
        // Load uploaded resume data if it exists
        if (dbData.uploadedResumeUrl) {
          setUploadedResumeUrl(dbData.uploadedResumeUrl);
          setShowUploadedToEmployers(dbData.showUploadedToEmployers || false);
        }
        
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

  // Check if all required fields are filled (only name and skills)
  const isFormValid = () => {
    const { personalInfo, skills } = resumeData;
    
    // Check personal info - only name is required
    if (!personalInfo.firstName || !personalInfo.lastName) {
      return false;
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
  const addOptionalSection = (type: 'certificates' | 'projects' | 'awards' | 'organizations') => {
    const sectionTitles = {
      certificates: 'Certificates & Seminars',
      projects: 'Projects',
      awards: 'Awards & Achievements',
      organizations: 'Organizations & Volunteer Experience'
    };

    const emptyData = {
      certificates: [{ name: '', issuer: '', date: '', description: '' }],
      projects: [{ name: '', description: '', technologies: '', startDate: '', endDate: '', url: '' }],
      awards: [{ title: '', issuer: '', date: '', description: '' }],
      organizations: [{ organization: '', role: '', startDate: '', endDate: '', description: '' }]
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
    const allTypes = ['certificates', 'projects', 'awards', 'organizations'] as const;
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


  // Organization Functions
  const addOrganization = (sectionId: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'organizations') {
      const newData = [...(section.data as Organization[]), { organization: '', role: '', startDate: '', endDate: '', description: '' }];
      updateOptionalSection(sectionId, newData);
    }
  };

  const updateOrganization = (sectionId: string, index: number, field: keyof Organization, value: string) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'organizations') {
      const newData = (section.data as Organization[]).map((org, i) => 
        i === index ? { ...org, [field]: value } : org
      );
      updateOptionalSection(sectionId, newData);
    }
  };

  const removeOrganization = (sectionId: string, index: number) => {
    const section = resumeData.optionalSections.find(s => s.id === sectionId);
    if (section && section.type === 'organizations' && (section.data as Organization[]).length > 1) {
      const newData = (section.data as Organization[]).filter((_, i) => i !== index);
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
          
          // Add some space before description
          yPosition += 2;
          
          // Split description into bullet points if it contains line breaks
          const descriptionParts = exp.description.split('\n').filter(part => part.trim());
          
          descriptionParts.forEach((part, partIndex) => {
            const bulletText = `• ${part.trim()}`;
            const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 12);
            checkPageBreak(bulletLines.length * 4 + 2);
            doc.text(bulletLines, margin + 12, yPosition);
            yPosition += bulletLines.length * 4;
            
            // Add small space between bullet points
            if (partIndex < descriptionParts.length - 1) {
              yPosition += 2;
            }
          });
          yPosition += 6; // More space after description
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
        doc.setTextColor(100, 100, 100); // Gray color for school
        doc.text(edu.school, margin, yPosition);
        yPosition += 4;
        
        // Location if available
        if (edu.location && edu.location.trim()) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120); // Lighter gray for location
          doc.text(edu.location, margin, yPosition);
          yPosition += 4;
        }
        
        // Description if available
        if (edu.description && edu.description.trim()) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
          const descLines = doc.splitTextToSize(edu.description, contentWidth - 8);
          doc.text(descLines, margin + 8, yPosition);
          yPosition += descLines.length * 3 + 2;
        }
        
        // Add spacing between education entries
        if (index < validEducation.length - 1) {
          yPosition += 6;
        }
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
        const validCertificates = (section.data as Certificate[]).filter(cert => cert.name && cert.name.trim());
        if (validCertificates.length > 0) {
          addSectionHeader('Certificates & Seminars');
          
          validCertificates.forEach((cert, index) => {
            checkPageBreak(25);
            
            // Certificate name - bold
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            
            // Handle long certificate names
            const nameLines = doc.splitTextToSize(cert.name, contentWidth - 80); // Leave space for date
            doc.text(nameLines, margin, yPosition);
            
            // Date (right aligned) - only if we have a date
            if (cert.date) {
              let dateText = cert.date;
              // Try to format the date if it's a year
              if (cert.date.match(/^\d{4}$/)) {
                dateText = cert.date;
              } else if (cert.date.includes(' ')) {
                // Already formatted like "April 2025"
                dateText = cert.date;
              }
              
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += nameLines.length * 4 + 2;
            
            // Issuer - italic (only if we have an issuer)
            if (cert.issuer && cert.issuer.trim()) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(100, 100, 100); // Gray color for issuer
              doc.text(cert.issuer, margin, yPosition);
              yPosition += 4;
            }
            
            // Description (only if we have a description)
            if (cert.description && cert.description.trim()) {
              yPosition += 2; // Add space before description
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
              const descLines = doc.splitTextToSize(cert.description, contentWidth - 12);
              checkPageBreak(descLines.length * 3 + 4);
              doc.text(descLines, margin + 12, yPosition);
              yPosition += descLines.length * 3 + 4;
            }
            
            // Add spacing between certificates
            if (index < validCertificates.length - 1) {
              yPosition += 8;
            }
          });
          yPosition += 5; // Extra space after certificates section
        }
      }

      if (section.type === 'projects') {
        const validProjects = (section.data as Project[]).filter(project => project.name && project.name.trim());
        if (validProjects.length > 0) {
          addSectionHeader('Projects');
          
          validProjects.forEach((project, index) => {
            checkPageBreak(30);
            
            // Project name - bold
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            
            // Handle long project names
            const nameLines = doc.splitTextToSize(project.name, contentWidth - 80); // Leave space for date
            doc.text(nameLines, margin, yPosition);
            
            // Date range (right aligned)
            let dateText = '';
            if (project.startDate && project.endDate && project.endDate !== 'present') {
              if (project.startDate.match(/^\d{4}$/) && project.endDate.match(/^\d{4}$/)) {
                dateText = `${project.startDate} - ${project.endDate}`;
              } else {
                dateText = `${project.startDate} - ${project.endDate}`;
              }
            } else if (project.startDate && project.endDate === 'present') {
              dateText = `${project.startDate} - Present`;
            } else if (project.startDate) {
              dateText = project.startDate;
            }
            
            if (dateText) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const dateWidth = doc.getTextWidth(dateText);
              doc.text(dateText, pageWidth - margin - dateWidth, yPosition);
            }
            yPosition += nameLines.length * 4 + 2;
            
            // Technologies - italic (only if we have technologies)
            if (project.technologies && project.technologies.trim()) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(100, 100, 100); // Gray color
              const techLines = doc.splitTextToSize(`Technologies: ${project.technologies}`, contentWidth);
              doc.text(techLines, margin, yPosition);
              yPosition += techLines.length * 4;
            }
            
            // URL (only if we have a URL)
            if (project.url && project.url.trim()) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 100, 200); // Blue for URL
              const urlLines = doc.splitTextToSize(project.url, contentWidth);
              doc.text(urlLines, margin, yPosition);
              doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]); // Reset color
              yPosition += urlLines.length * 3 + 2;
            }
            
            // Description (only if we have a description)
            if (project.description && project.description.trim()) {
              yPosition += 2; // Add space before description
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
              const descLines = doc.splitTextToSize(project.description, contentWidth - 12);
              checkPageBreak(descLines.length * 4 + 4);
              doc.text(descLines, margin + 12, yPosition);
              yPosition += descLines.length * 4 + 4;
            }
            
            // Add spacing between projects
            if (index < validProjects.length - 1) {
              yPosition += 10;
            }
          });
          yPosition += 5; // Extra space after projects section
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

      if (section.type === 'organizations') {
        const validOrganizations = (section.data as Organization[]).filter(org => org.organization && org.role);
        if (validOrganizations.length > 0) {
          addSectionHeader('Organizations & Volunteer Experience');
          
          validOrganizations.forEach((org, index) => {
            checkPageBreak(20);
            
            // Role - bold
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.text(org.role, margin, yPosition);
            
            // Date range (right aligned)
            let dateText = '';
            if (org.startDate && org.endDate && org.endDate !== 'present') {
              const startDate = new Date(org.startDate + '-01');
              const endDate = new Date(org.endDate + '-01');
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              dateText = `${startMonth} - ${endMonth}`;
            } else if (org.startDate) {
              const startDate = new Date(org.startDate + '-01');
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
            let orgText = org.organization;
            doc.text(orgText, margin, yPosition);
            yPosition += 4;
            
            // Description
            if (org.description) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const descLines = doc.splitTextToSize(org.description, contentWidth - 8);
              checkPageBreak(descLines.length * 4 + 2);
              doc.text(descLines, margin + 8, yPosition);
              yPosition += descLines.length * 4;
            }
            
            if (index < validOrganizations.length - 1) {
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
      
      // Use the already uploaded resume URL (uploaded when user consented)
      const uploadedResumeCloudUrl = uploadedResumeUrl;
      
      // Save to database via API
      await saveResumeToDatabase(cleanedData, pdfBase64, uploadedResumeCloudUrl);
      
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

  // Handle consent modal response
  const handleUploadConsentYes = async () => {
    if (!pendingUploadFile) return;
    
    try {
      console.log('📤 User consented - uploading original resume to cloud...');
      const uploadResult = await uploadOriginalResumeToCloud(pendingUploadFile);
      
      if (uploadResult.success && uploadResult.data) {
        setUploadedResumeFile(pendingUploadFile);
        setUploadedResumeUrl(uploadResult.data.cloudUrl);
        setShowUploadedToEmployers(true);
        console.log('✅ Original resume uploaded:', uploadResult.data.cloudUrl);
        alert('Your original resume has been saved and will be shown to employers!');
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Failed to upload original resume:', error);
      alert('Failed to upload your resume to cloud. You can still use the generated resume.');
    } finally {
      setShowUploadConsentModal(false);
      setPendingUploadFile(null);
    }
  };

  const handleUploadConsentNo = () => {
    console.log('❌ User declined - not uploading original resume');
    setShowUploadConsentModal(false);
    setPendingUploadFile(null);
    setShowUploadedToEmployers(false);
  };

  // Function to upload original resume PDF to cloud
  const uploadOriginalResumeToCloud = async (file: File): Promise<{ success: boolean; data?: { cloudUrl: string; publicId: string }; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append('originalResume', file);

      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await auth.currentUser.getIdToken();

      const response = await fetch('http://localhost:3001/api/jobseekers/upload-original-resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('❌ Server error details:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Original resume upload error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload original resume'
      };
    }
  };

  // Function to save resume to database
  const saveResumeToDatabase = async (resumeData: ResumeData, pdfBase64: string, uploadedResumeUrl: string | null = null) => {
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
      
      
      // Create enhanced resume data with readable location names and consent
      const enhancedResumeData = {
        ...resumeData,
        personalInfo: {
          ...resumeData.personalInfo,
          // Add readable location names for database storage
          regionName,
          provinceName,
          cityName,
          barangayName
        },
        showToEmployers, // Add user consent for employer visibility
        uploadedResumeUrl, // Add uploaded resume URL if available
        showUploadedToEmployers // Add consent for showing uploaded resume
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
      
      
      try {
        setResumeUploading(true);
        
        // Upload and parse resume using apiService
        const result = await apiService.parseResume(file);
        
        if (result.success && result.data) {
          // Auto-fill form with parsed data
          autoFillFormData(result.data);
          setResumeParseSuccess(true);
          
          // Show success message briefly
          setTimeout(() => setResumeParseSuccess(false), 5000);
          
          // Store the file and show consent modal
          setPendingUploadFile(file);
          setShowUploadConsentModal(true);
        } else {
          throw new Error(result.error || 'Failed to parse resume data');
        }
        
      } catch (error) {
        console.error('Resume upload error:', error);
        alert(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setResumeUploading(false);
      }
    }
  };

  const autoFillFormData = (parsedData: any) => {
    
    // Update personal info
    if (parsedData.personalInfo) {
      const personalInfo = parsedData.personalInfo;
      
      
      // Handle name parsing - try multiple approaches
      if (personalInfo.firstName && personalInfo.lastName) {
        updatePersonalInfo('firstName', capitalizeWords(personalInfo.firstName));
        updatePersonalInfo('lastName', capitalizeWords(personalInfo.lastName));
      } else if (personalInfo.fullName) {
        console.log('🔄 Parsing fullName:', personalInfo.fullName);
        const nameParts = personalInfo.fullName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          updatePersonalInfo('firstName', capitalizeWords(nameParts[0]));
          updatePersonalInfo('lastName', capitalizeWords(nameParts.slice(1).join(' ')));
        }
      } else if (personalInfo.name) {
        console.log('🔄 Parsing name field:', personalInfo.name);
        const nameParts = personalInfo.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          updatePersonalInfo('firstName', capitalizeWords(nameParts[0]));
          updatePersonalInfo('lastName', capitalizeWords(nameParts.slice(1).join(' ')));
        }
      } else {
        console.log('❌ No name information found in parsed data');
      }
      
      if (personalInfo.email) {
        updatePersonalInfo('email', personalInfo.email);
      }
      
      if (personalInfo.phone) {
        const convertedPhone = convertToPhilippineFormat(personalInfo.phone);
        updatePersonalInfo('phone', convertedPhone);
      }
      
      // Handle address - put the full parsed address in the address field
      // The user can manually select PSGC dropdowns, but we'll put the parsed address in the street address field
      if (personalInfo.address) {
        updatePersonalInfo('address', personalInfo.address);
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
      const validCertifications = parsedData.certifications.filter((cert: any) => {
        // Handle both string and object formats
        if (typeof cert === 'string') {
          return cert.trim();
        } else if (cert && typeof cert === 'object' && cert.name) {
          return cert.name.trim();
        }
        return false;
      }).map((cert: any) => {
        // Convert objects to strings for the form
        if (typeof cert === 'string') {
          return cert;
        } else if (cert && typeof cert === 'object') {
          return cert.name || '';
        }
        return '';
      });
      
      if (validCertifications.length > 0) {
        setResumeData(prev => ({
          ...prev,
          certifications: validCertifications
        }));
      }
    }
    
    // Update optional sections
    
    if (parsedData.optionalSections && parsedData.optionalSections.length > 0) {
      
      const newOptionalSections: OptionalSection[] = [];
      const newSectionOrder: SectionOrder[] = [...resumeData.sectionOrder];
      
      parsedData.optionalSections.forEach((section: any) => {
        
        switch (section.type) {
          case 'certificates':
            // Handle certificates as structured Certificate objects
            if (section.data && section.data.length > 0) {
              const certificates: Certificate[] = section.data.map((cert: any) => {
                if (typeof cert === 'string') {
                  return {
                    name: cert,
                    issuer: '',
                    date: '',
                    description: ''
                  };
                } else {
                  return {
                    name: cert.name || cert.title || '',
                    issuer: cert.issuer || '',
                    date: cert.date || '',
                    description: cert.description || ''
                  };
                }
              }).filter((cert: Certificate) => cert.name.trim());
              
              if (certificates.length > 0) {
                const sectionId = section.id || `certificates-${Date.now()}`;
                newOptionalSections.push({
                  id: sectionId,
                  type: 'certificates',
                  title: section.title || 'Certificates & Seminars',
                  data: certificates
                });
                
                // Add to section order if not already present
                if (!newSectionOrder.find(s => s.id === sectionId)) {
                  newSectionOrder.push({
                    id: sectionId,
                    type: 'optional',
                    title: section.title || 'Certificates & Seminars',
                    optionalType: 'certificates'
                  });
                }
              }
            }
            break;
            
          case 'projects':
            // Handle projects
            if (section.data && section.data.length > 0) {
              const projects: Project[] = section.data.map((project: any) => ({
                name: project.name || project.title || '',
                description: project.description || '',
                technologies: project.technologies || '',
                startDate: project.startDate || '',
                endDate: project.endDate || '',
                url: project.url || ''
              })).filter((proj: Project) => proj.name.trim());
              
              if (projects.length > 0) {
                const sectionId = section.id || `projects-${Date.now()}`;
                newOptionalSections.push({
                  id: sectionId,
                  type: 'projects',
                  title: section.title || 'Projects',
                  data: projects
                });
                
                // Add to section order if not already present
                if (!newSectionOrder.find(s => s.id === sectionId)) {
                  newSectionOrder.push({
                    id: sectionId,
                    type: 'optional',
                    title: section.title || 'Projects',
                    optionalType: 'projects'
                  });
                }
              }
            }
            break;
            
          case 'awards':
            // Handle awards
            if (section.data && section.data.length > 0) {
              const awards: Award[] = section.data.map((award: any) => ({
                title: award.title || award.name || '',
                issuer: award.issuer || award.organization || '',
                date: award.date || '',
                description: award.description || ''
              })).filter((award: Award) => award.title.trim());
              
              if (awards.length > 0) {
                const sectionId = section.id || `awards-${Date.now()}`;
                newOptionalSections.push({
                  id: sectionId,
                  type: 'awards',
                  title: section.title || 'Awards & Achievements',
                  data: awards
                });
                
                // Add to section order if not already present
                if (!newSectionOrder.find(s => s.id === sectionId)) {
                  newSectionOrder.push({
                    id: sectionId,
                    type: 'optional',
                    title: section.title || 'Awards & Achievements',
                    optionalType: 'awards'
                  });
                }
              }
            }
            break;
            
          case 'volunteer':
          case 'organizations':
            // Handle organizations/volunteer experience
            if (section.data && section.data.length > 0) {
              const organizations: Organization[] = section.data.map((org: any) => ({
                organization: org.organization || '',
                role: org.role || org.position || '',
                startDate: org.startDate || '',
                endDate: org.endDate || '',
                description: org.description || ''
              })).filter((org: Organization) => org.organization.trim() && org.role.trim());
              
              if (organizations.length > 0) {
                const sectionId = section.id || `organizations-${Date.now()}`;
                newOptionalSections.push({
                  id: sectionId,
                  type: 'organizations',
                  title: section.title || 'Organizations & Volunteer Experience',
                  data: organizations
                });
                
                // Add to section order if not already present
                if (!newSectionOrder.find(s => s.id === sectionId)) {
                  newSectionOrder.push({
                    id: sectionId,
                    type: 'optional',
                    title: section.title || 'Organizations & Volunteer Experience',
                    optionalType: 'organizations'
                  });
                }
              }
            }
            break;
            
          default:
            break;
        }
      });
      
      // Update resumeData with all new optional sections and section order
      if (newOptionalSections.length > 0) {
        setResumeData(prev => ({
          ...prev,
          optionalSections: newOptionalSections,
          sectionOrder: newSectionOrder
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
      
      {/* Header Section with Actions */}
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
      
      
      {/* Header Section with Actions */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          {/* Left: Title and Description */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiFileText size={32} />
              Create Your Resume
            </h1>
            <p style={{ fontSize: '15px', opacity: 0.95, marginBottom: '20px', lineHeight: '1.6' }}>
              Build a professional resume in minutes. Upload an existing resume to auto-fill, or start from scratch.
            </p>
            
            {/* Quick Upload Button */}
            <input
              type="file"
              ref={resumeFileInputRef}
              onChange={handleResumeUpload}
              accept="application/pdf"
              style={{ display: 'none' }}
            />
            <button
              onClick={triggerResumeUpload}
              disabled={resumeUploading}
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: resumeUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                if (!resumeUploading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {resumeUploading ? (
                <>
                  <div className={styles.spinner} style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                  <span>Parsing Resume...</span>
                </>
              ) : (
                <>
                  <FiUpload size={20} />
                  <span>Quick Start: Upload Resume</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
            <button 
              onClick={handleSaveResume}
              disabled={isSaving || !isFormValid()}
              style={{
                padding: '14px 24px',
                backgroundColor: isSaving || !isFormValid() ? 'rgba(255, 255, 255, 0.1)' : 'white',
                border: 'none',
                borderRadius: '10px',
                color: isSaving || !isFormValid() ? 'rgba(255, 255, 255, 0.5)' : '#667eea',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isSaving || !isFormValid() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                boxShadow: isSaving || !isFormValid() ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && isFormValid()) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
            >
              <FiDownload size={18} />
              {isSaving ? 'Generating...' : 'Save & Generate'}
            </button>
            
            <button 
              onClick={handleDownloadPDF}
              disabled={!isPDFReady || hasUnsavedChanges || !isFormValid()}
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                color: (!isPDFReady || hasUnsavedChanges || !isFormValid()) ? 'rgba(255, 255, 255, 0.4)' : 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (!isPDFReady || hasUnsavedChanges || !isFormValid()) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (isPDFReady && !hasUnsavedChanges && isFormValid()) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <FiDownload size={16} />
              Download PDF
            </button>
            
            <button 
              onClick={handleClearAllFields}
              style={{
                padding: '10px 24px',
                backgroundColor: 'transparent',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 100, 100, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              <FiTrash2 size={14} />
              Clear All
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {resumeParseSuccess && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <FiCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Resume parsed successfully!</div>
                <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.5' }}>
                  Review and adjust the auto-filled information below. Don't forget to manually select your address from the dropdowns.
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadedResumeFile && showUploadedToEmployers && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            borderRadius: '10px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>✅</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Original Resume Uploaded</div>
                <div style={{ fontSize: '13px', opacity: 0.95 }}>
                  Your original resume ({uploadedResumeFile.name}) will be shown to employers alongside the generated one.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions & Disclaimer - Collapsible */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        border: '2px solid #3b82f6',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
      }}>
        {/* Header - Always Visible */}
        <div 
          onClick={() => setShowInstructions(!showInstructions)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            padding: '4px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiAlertCircle size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '2px' }}>
                How to Create Your Resume
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Step-by-step guide and important notes
              </p>
            </div>
          </div>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: showInstructions ? '#dbeafe' : '#f3f4f6',
            borderRadius: '6px',
            border: `1px solid ${showInstructions ? '#3b82f6' : '#e5e7eb'}`
          }}>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '600',
              color: showInstructions ? '#1e40af' : '#6b7280'
            }}>
              {showInstructions ? 'Hide' : 'Show'}
            </span>
            {showInstructions ? <FiChevronUp size={18} color="#1e40af" /> : <FiChevronDown size={18} color="#6b7280" />}
          </div>
        </div>

        {/* Collapsible Content */}
        {showInstructions && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
              Follow these steps to create your professional resume:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  flexShrink: 0
                }}>1</span>
                <div>
                  <strong style={{ color: '#374151', fontSize: '14px' }}>Fill out the form</strong>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    Enter your information manually or use "Quick Start: Upload Resume" to auto-fill fields.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  flexShrink: 0
                }}>2</span>
                <div>
                  <strong style={{ color: '#374151', fontSize: '14px' }}>Review & verify</strong>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    Double-check all information for accuracy. The parser may not capture everything perfectly.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  flexShrink: 0
                }}>3</span>
                <div>
                  <strong style={{ color: '#374151', fontSize: '14px' }}>Save & Generate</strong>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    Click "Save & Generate" to create your professional resume and save it to your profile.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  flexShrink: 0
                }}>4</span>
                <div>
                  <strong style={{ color: '#374151', fontSize: '14px' }}>Apply to jobs</strong>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    Your resume will be automatically attached when you apply for jobs. Employers can view both your generated and original resume (if uploaded).
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div style={{
              backgroundColor: '#fff3cd',
              borderLeft: '4px solid #ffc107',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <FiAlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#92400e', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                    Important Notes:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#78350f', lineHeight: '1.6' }}>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>Job Matching Requirement:</strong> A complete resume is essential for accurate job matching. Our system analyzes your skills, experience, and qualifications to match you with suitable opportunities. Without a resume, job matching will be limited.
                    </li>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>Resume Parser Accuracy:</strong> The auto-fill feature uses AI to extract information from your uploaded resume. While it's helpful, it may not be 100% accurate. Always review and correct any errors.
                    </li>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>If Parser Fails:</strong> If the upload doesn't work or information is missing, simply fill out the form manually. All fields are editable.
                    </li>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>Address Selection:</strong> For your address, you must manually select Region, Province, City, and Barangay from the dropdown menus for accurate location data.
                    </li>
                    <li>
                      <strong>Resume Visibility:</strong> Your generated resume will be shown to employers when you apply for jobs. If you upload an original resume and consent, employers will see both versions.
                    </li>
                  </ul>
                </div>
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
                Email Address
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
                Phone Number
              </label>
              <input
                type="tel"
                value={resumeData.personalInfo.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+63 9XX-XXX-XXXX"
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
            Region ({regions.length} available)
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
            Province ({provinces.length} available)
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
            City/Municipality ({cities.length} available)
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
            Barangay ({barangays.length} available)
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
            Street Address
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
            Zip Code
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
            Birthday
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
            Age
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
      {resumeData.sectionOrder && resumeData.sectionOrder.length > 1 ? resumeData.sectionOrder.slice(1).map((section, index) => {
        const sectionIndex = index + 1; // Adjust for skipping personal info
        
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
                        <label>Start date</label>
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
                  {optionalSection.type === 'organizations' && <FiUser className={styles.sectionIcon} />}
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

              {/* Organizations Section */}
              {optionalSection.type === 'organizations' && (
                <>
                  {(optionalSection.data as Organization[]).map((org, index) => (
                    <div key={index} className={styles.itemContainer}>
                      <div className={styles.itemHeader}>
                        <h3 className={styles.itemTitle}>Organization {index + 1}</h3>
                        {(optionalSection.data as Organization[]).length > 1 && (
                          <button 
                            onClick={() => removeOrganization(optionalSection.id, index)}
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
                            value={org.organization}
                            onChange={(e) => updateOrganization(optionalSection.id, index, 'organization', e.target.value)}
                            placeholder="Red Cross"
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Role</label>
                          <input
                            type="text"
                            value={org.role}
                            onChange={(e) => updateOrganization(optionalSection.id, index, 'role', e.target.value)}
                            placeholder="Volunteer Coordinator"
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <div className={styles.formGroup} style={{ flex: '1' }}>
                            <label>Start Date</label>
                            <input
                              type="month"
                              value={org.startDate}
                              onChange={(e) => updateOrganization(optionalSection.id, index, 'startDate', e.target.value)}
                              className={styles.formInput}
                            />
                          </div>
                          <div className={styles.formGroup} style={{ flex: '1' }}>
                            <label>End Date</label>
                            <input
                              type="month"
                              value={org.endDate === 'present' ? '' : org.endDate}
                              onChange={(e) => updateOrganization(optionalSection.id, index, 'endDate', e.target.value)}
                              className={styles.formInput}
                              disabled={org.endDate === 'present'}
                            />
                            <label className={styles.presentCheckbox}>
                              <input
                                type="checkbox"
                                checked={org.endDate === 'present'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateOrganization(optionalSection.id, index, 'endDate', 'present');
                                  } else {
                                    updateOrganization(optionalSection.id, index, 'endDate', '');
                                  }
                                }}
                              />
                              <span>Currently active</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                          value={org.description}
                          onChange={(e) => updateOrganization(optionalSection.id, index, 'description', e.target.value)}
                          placeholder="Describe your role and activities..."
                          className={styles.formTextarea}
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addOrganization(optionalSection.id)}
                    className={styles.addButton}
                  >
                    <FiPlus /> Add Organization
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
              <h2 className={styles.sectionTitle}>Skills <span className={styles.required}>*</span></h2>
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
                  addOptionalSection(e.target.value as 'certificates' | 'projects' | 'awards' | 'organizations');
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
                  organizations: 'Organizations & Volunteer Experience'
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

      </div>

      {/* Upload Consent Modal */}
      {showUploadConsentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                animation: 'bounce 1s ease-in-out'
              }}>
                📄
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                Show Your Resume to Employers?
              </h2>
              <p style={{ 
                fontSize: '15px', 
                color: '#6b7280',
                lineHeight: '1.6'
              }}>
                Would you like to save your original uploaded resume and show it to employers alongside the generated resume?
              </p>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <div>
                  <strong style={{ display: 'block', color: '#374151', marginBottom: '4px' }}>
                    If you choose "Yes":
                  </strong>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Your original resume will be uploaded to secure cloud storage and employers will see both your original and generated resumes.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>❌</span>
                <div>
                  <strong style={{ display: 'block', color: '#374151', marginBottom: '4px' }}>
                    If you choose "No":
                  </strong>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Only the generated resume will be shown to employers. Your original file won't be saved.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleUploadConsentNo}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                No, Thanks
              </button>
              <button
                onClick={handleUploadConsentYes}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
                }}
              >
                Yes, Show It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Buttons - Shows when scrolling */}
      {showStickyButton && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Back to Top Button */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              padding: '12px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s',
              width: '48px',
              height: '48px',
              alignSelf: 'flex-end'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
            title="Back to top"
          >
            <FiChevronUp size={24} />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveResume}
            disabled={isSaving || !isFormValid()}
            style={{
              padding: '16px 32px',
              backgroundColor: isSaving || !isFormValid() ? '#9ca3af' : '#667eea',
              border: 'none',
              borderRadius: '50px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isSaving || !isFormValid() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s',
              minWidth: '200px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isSaving && isFormValid()) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
            }}
          >
            {isSaving ? (
              <>
                <div className={styles.spinner} style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiDownload size={20} />
                <span>Save & Generate</span>
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CreateResumeTab;
