import React, { useState, useEffect } from 'react';
import { Job } from '@/types/Job';
import { FiPlus, FiMinus, FiBriefcase } from 'react-icons/fi';
import Button from '../ui/Button';
import styles from './JobFormModal.module.css';

interface PostJobTabProps {
  job?: Job | null;
  onSave: (jobData: Partial<Job>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const defaultJobData = {
  title: '',
  location: '',
  type: '',
  level: '',
  salaryMin: '',
  salaryMax: '',
  description: '',
  requirements: [''],
  responsibilities: [''],
  benefits: [''],
  department: '',
  workplaceType: '',
  status: 'active',
  educationLevel: '',
  preferredCourse: ''
};

export const PostJobTab: React.FC<PostJobTabProps> = ({
  job,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState(() => {
    if (isEditing && job) {
      let salaryMin = '';
      let salaryMax = '';
      
      if (typeof job.salaryMin === 'number' && job.salaryMin > 0) {
        salaryMin = job.salaryMin.toString();
      }
      if (typeof job.salaryMax === 'number' && job.salaryMax > 0) {
        salaryMax = job.salaryMax.toString();
      }
      
      return {
        title: job.title || '',
        location: job.location || '',
        type: job.type || '',
        level: job.level || job.experienceLevel || '',
        salaryMin,
        salaryMax,
        description: job.description || '',
        requirements: job.requirements && job.requirements.length > 0 ? job.requirements : [''],
        responsibilities: job.responsibilities && job.responsibilities.length > 0 ? job.responsibilities : [''],
        benefits: job.benefits && job.benefits.length > 0 ? job.benefits : [''],
        department: job.department || '',
        workplaceType: job.workplaceType || (job.remote ? '' : ''),
        status: job.status || '',
        educationLevel: job.educationLevel || '',
        preferredCourse: job.preferredCourse || ''
      };
    }
    return defaultJobData;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && job) {
      let salaryMin = '';
      let salaryMax = '';
      
      if (typeof job.salaryMin === 'number' && job.salaryMin > 0) {
        salaryMin = job.salaryMin.toString();
      }
      if (typeof job.salaryMax === 'number' && job.salaryMax > 0) {
        salaryMax = job.salaryMax.toString();
      }
      
      const newFormData = {
        title: job.title || '',
        location: job.location || '',
        type: job.type || '',
        level: job.level || job.experienceLevel || '',
        salaryMin,
        salaryMax,
        description: job.description || '',
        requirements: job.requirements && job.requirements.length > 0 ? job.requirements : [''],
        responsibilities: job.responsibilities && job.responsibilities.length > 0 ? job.responsibilities : [''],
        benefits: job.benefits && job.benefits.length > 0 ? job.benefits : [''],
        department: job.department || '',
        workplaceType: job.workplaceType || (job.remote ? '' : ''),
        status: job.status || '',
        educationLevel: job.educationLevel || '',
        preferredCourse: job.preferredCourse || ''
      };
      
      setFormData(newFormData);
    } else if (!isEditing) {
      setFormData(defaultJobData);
      setErrors({});
    }
  }, [job, isEditing]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({ ...prev, requirements: newRequirements }));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const newResponsibilities = [...formData.responsibilities];
    newResponsibilities[index] = value;
    setFormData(prev => ({ ...prev, responsibilities: newResponsibilities }));
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData(prev => ({ ...prev, benefits: newBenefits }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const addResponsibility = () => {
    setFormData(prev => ({
      ...prev,
      responsibilities: [...prev.responsibilities, '']
    }));
  };

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const removeRequirement = (index: number) => {
    if (formData.requirements.length > 1) {
      const newRequirements = formData.requirements.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, requirements: newRequirements }));
    }
  };

  const removeResponsibility = (index: number) => {
    if (formData.responsibilities.length > 1) {
      const newResponsibilities = formData.responsibilities.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, responsibilities: newResponsibilities }));
    }
  };

  const removeBenefit = (index: number) => {
    if (formData.benefits.length > 1) {
      const newBenefits = formData.benefits.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, benefits: newBenefits }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }
    if (formData.requirements.every(req => !req.trim())) {
      newErrors.requirements = 'At least one requirement is needed';
    }

    const minSalaryValue = formData.salaryMin?.toString().trim() || '';
    const maxSalaryValue = formData.salaryMax?.toString().trim() || '';
    
    if (minSalaryValue !== '') {
      const minSalary = parseInt(minSalaryValue);
      if (isNaN(minSalary) || minSalary <= 0) {
        newErrors.salaryMin = 'Please enter a valid minimum salary';
      }
    }
    
    if (maxSalaryValue !== '') {
      const maxSalary = parseInt(maxSalaryValue);
      if (isNaN(maxSalary) || maxSalary <= 0) {
        newErrors.salaryMax = 'Please enter a valid maximum salary';
      }
    }
    
    if (minSalaryValue !== '' && maxSalaryValue !== '') {
      const minSalary = parseInt(minSalaryValue);
      const maxSalary = parseInt(maxSalaryValue);
      
      if (!isNaN(minSalary) && !isNaN(maxSalary) && minSalary > 0 && maxSalary > 0) {
        if (maxSalary < minSalary) {
          newErrors.salaryMax = 'Maximum salary must be higher than minimum salary';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const filteredRequirements = formData.requirements.filter(req => req.trim());
    const filteredResponsibilities = formData.responsibilities.filter(resp => resp.trim());
    const filteredBenefits = formData.benefits.filter(ben => ben.trim());
    
    const salaryMin = formData.salaryMin?.trim() ? parseInt(formData.salaryMin.trim()) : undefined;
    const salaryMax = formData.salaryMax?.trim() ? parseInt(formData.salaryMax.trim()) : undefined;
    
    let salary = undefined;
    if (salaryMin !== undefined && salaryMax !== undefined && !isNaN(salaryMin) && !isNaN(salaryMax)) {
      salary = Math.round((salaryMin + salaryMax) / 2);
    } else if (salaryMin !== undefined && !isNaN(salaryMin)) {
      salary = salaryMin;
    } else if (salaryMax !== undefined && !isNaN(salaryMax)) {
      salary = salaryMax;
    }
    
    const jobData: Partial<Job> = {
      title: formData.title,
      location: formData.location,
      type: formData.type,
      level: formData.level,
      description: formData.description,
      department: formData.department,
      workplaceType: formData.workplaceType as 'On-site' | 'Hybrid' | 'Remote',
      status: formData.status,
      salary,
      salaryMin,
      salaryMax,
      requirements: filteredRequirements,
      responsibilities: filteredResponsibilities,
      benefits: filteredBenefits,
      educationLevel: formData.educationLevel,
      preferredCourse: formData.preferredCourse,
      ...(isEditing && job ? { id: job.id } : {})
    };

    onSave(jobData);
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabHeader}>
        <div className={styles.headerContent}>
          <div className={styles.jobIcon}>
            <FiBriefcase size={32} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>
              {isEditing ? 'Edit Job Posting' : 'Create New Job Posting'}
            </h2>
            <p className={styles.subtitle}>
              {isEditing ? 'Update job details and requirements' : 'Fill in the details to create a new job posting'}
            </p>
          </div>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formContent}>
          {/* Three-Column Layout */}
          <div className={styles.compactSection}>
            <div className={styles.threeColumnGrid}>
              {/* Column 1: Job Details */}
              <div className={styles.compactColumn}>
                <h4 className={styles.compactTitle}>Job Details</h4>
                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Job Title <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.compactInput} ${errors.title ? styles.inputError : ''}`}
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g. Senior Frontend Developer"
                  />
                  {errors.title && <span className={styles.errorText}>{errors.title}</span>}
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Location <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.compactInput} ${errors.location ? styles.inputError : ''}`}
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g. Makati City, Metro Manila"
                  />
                  {errors.location && <span className={styles.errorText}>{errors.location}</span>}
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Department</label>
                  <select
                    className={styles.compactInput}
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    
                    <optgroup label="Technology & Engineering">
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                      <option value="Blockchain">Blockchain</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Data Science">Data Science</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Security">Security</option>
                      <option value="Software Development">Software Development</option>
                    </optgroup>

                    <optgroup label="Business & Sales">
                      <option value="Account Management">Account Management</option>
                      <option value="Business Development">Business Development</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Content Marketing">Content Marketing</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                    </optgroup>

                    <optgroup label="Human Resources & Admin">
                      <option value="Administration">Administration</option>
                      <option value="Executive">Executive</option>
                      <option value="HR">Human Resources</option>
                      <option value="Talent Acquisition">Talent Acquisition</option>
                      <option value="Training & Development">Training & Development</option>
                    </optgroup>

                    <optgroup label="Finance & Legal">
                      <option value="Accounting">Accounting</option>
                      <option value="Banking">Banking</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Finance">Finance</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Investment">Investment</option>
                      <option value="Legal">Legal</option>
                    </optgroup>

                    <optgroup label="Operations & Management">
                      <option value="Logistics">Logistics</option>
                      <option value="Operations">Operations</option>
                      <option value="Project Management">Project Management</option>
                      <option value="Supply Chain">Supply Chain</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Warehouse">Warehouse</option>
                    </optgroup>

                    <optgroup label="Design & Creative">
                      <option value="Broadcasting">Broadcasting</option>
                      <option value="Design">Design</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Journalism">Journalism</option>
                      <option value="Media & Communications">Media & Communications</option>
                      <option value="Public Relations">Public Relations</option>
                      <option value="UX/UI Design">UX/UI Design</option>
                    </optgroup>

                    <optgroup label="Product & Customer">
                      <option value="Customer Success">Customer Success</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Product">Product</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Research & Development">Research & Development</option>
                    </optgroup>

                    <optgroup label="Healthcare & Medical">
                      <option value="Healthcare">Healthcare</option>
                      <option value="Medical">Medical</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Pharmacy">Pharmacy</option>
                    </optgroup>

                    <optgroup label="Education & Training">
                      <option value="Education">Education</option>
                      <option value="Teaching">Teaching</option>
                    </optgroup>

                    <optgroup label="Manufacturing & Production">
                      <option value="Aerospace">Aerospace</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Chemical">Chemical</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Production">Production</option>
                      <option value="Quality Control">Quality Control</option>
                      <option value="Textiles">Textiles</option>
                    </optgroup>

                    <optgroup label="Real Estate & Construction">
                      <option value="Architecture">Architecture</option>
                      <option value="Construction">Construction</option>
                      <option value="Property Management">Property Management</option>
                      <option value="Real Estate">Real Estate</option>
                    </optgroup>

                    <optgroup label="Retail & E-commerce">
                      <option value="E-commerce">E-commerce</option>
                      <option value="Retail">Retail</option>
                    </optgroup>

                    <optgroup label="Hospitality & Tourism">
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Hospitality">Hospitality</option>
                      <option value="Tourism">Tourism</option>
                    </optgroup>

                    <optgroup label="Energy & Environment">
                      <option value="Energy">Energy</option>
                      <option value="Environmental">Environmental</option>
                      <option value="Mining">Mining</option>
                      <option value="Oil & Gas">Oil & Gas</option>
                      <option value="Renewable Energy">Renewable Energy</option>
                    </optgroup>

                    <optgroup label="Entertainment & Media">
                      <option value="Entertainment">Entertainment</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Publishing">Publishing</option>
                      <option value="Sports & Recreation">Sports & Recreation</option>
                    </optgroup>

                    <optgroup label="Science & Research">
                      <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                      <option value="Biotechnology">Biotechnology</option>
                      <option value="Pharmaceuticals">Pharmaceuticals</option>
                    </optgroup>

                    <optgroup label="Public & Non-Profit">
                      <option value="Government">Government</option>
                      <option value="Non-Profit">Non-Profit</option>
                    </optgroup>

                    <optgroup label="Telecommunications & Other">
                      <option value="Agriculture">Agriculture</option>
                      <option value="Telecommunications">Telecommunications</option>
                    </optgroup>
                  </select>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Job Type <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.compactSelect}
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Job Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              {/* Column 2: Employment Info */}
              <div className={styles.compactColumn}>
                <h4 className={styles.compactTitle}>Employment</h4>
                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Experience Level <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.compactSelect}
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Experience Level</option>
                    <option value="Entry-level">Entry-level</option>
                    <option value="Mid-level">Mid-level</option>
                    <option value="Senior-level">Senior-level</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Director">Director</option>
                  </select>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Workplace Type <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.compactSelect}
                    value={formData.workplaceType}
                    onChange={(e) => handleInputChange('workplaceType', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Workplace Type</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Job Posting Status <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={`${styles.compactSelect} ${!formData.status ? 'placeholderText' : ''}`}
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Education Level</label>
                  <select
                    className={styles.compactSelect}
                    value={formData.educationLevel}
                    onChange={(e) => handleInputChange('educationLevel', e.target.value)}
                  >
                    <option value="">Not Specified</option>
                    <option value="High School">High School</option>
                    <option value="Associate Degree">Associate Degree</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="Doctorate">Doctorate</option>
                    <option value="Professional Certification">Professional Certification</option>
                  </select>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Preferred Course/Field</label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={formData.preferredCourse}
                    onChange={(e) => handleInputChange('preferredCourse', e.target.value)}
                    placeholder="e.g. Computer Science, Engineering"
                  />
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Salary Range</label>
                  <div className={styles.compactSalaryRange}>
                    <div className={styles.compactSalaryInput}>
                      <span className={styles.currencySymbol}></span>
                      <input
                        type="number"
                        value={formData.salaryMin || ''}
                        onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                        className={`${styles.compactInput} ${errors.salaryMin ? styles.inputError : ''}`}
                        placeholder="Min"
                      />
                    </div>
                    <span className={styles.salaryDivider}>-</span>
                    <div className={styles.compactSalaryInput}>
                      <span className={styles.currencySymbol}></span>
                      <input
                        type="number"
                        value={formData.salaryMax || ''}
                        onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                        className={`${styles.compactInput} ${errors.salaryMax ? styles.inputError : ''}`}
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  {(errors.salaryMin || errors.salaryMax) && (
                    <span className={styles.errorText}>
                      {errors.salaryMin || errors.salaryMax}
                    </span>
                  )}
                </div>
              </div>

              {/* Column 3: Job Description */}
              <div className={styles.compactColumn}>
                <h4 className={styles.compactTitle}>Description</h4>
                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Job Description <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.textareaContainer}>
                    <textarea
                      className={`${styles.compactTextarea} ${errors.description ? styles.inputError : ''}`}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe the role and responsibilities..."
                      rows={8}
                      required
                    />
                  </div>
                  {errors.description && <span className={styles.errorText}>{errors.description}</span>}
                </div>
              </div>

            </div>
          </div>

          {/* Two-Column Layout for Lists */}
          <div className={styles.compactSection}>
            <div className={styles.twoColumnGrid}>
              {/* Left Column - Requirements & Responsibilities */}
              <div className={styles.compactColumn}>
                <h4 className={styles.compactTitle}>Requirements & Responsibilities</h4>
                
                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>
                    Required Skills and Experience <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.compactListContainer}>
                    {formData.requirements.map((requirement, index) => (
                      <div key={index} className={styles.compactRequirementRow}>
                        <input
                          type="text"
                          className={styles.compactInput}
                          value={requirement}
                          onChange={(e) => handleRequirementChange(index, e.target.value)}
                          placeholder="e.g. 3+ years React experience, TypeScript proficiency"
                        />
                        {formData.requirements.length > 1 && (
                          <button
                            type="button"
                            className={styles.compactRemoveButton}
                            onClick={() => removeRequirement(index)}
                          >
                            <FiMinus />
                          </button>
                        )}
                      </div>
                    ))}
                    {errors.requirements && <span className={styles.errorText}>{errors.requirements}</span>}
                    <button
                      type="button"
                      className={styles.compactAddButton}
                      onClick={addRequirement}
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                </div>

                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Key Responsibilities</label>
                  <div className={styles.compactListContainer}>
                    {formData.responsibilities.map((responsibility, index) => (
                      <div key={index} className={styles.compactRequirementRow}>
                        <input
                          type="text"
                          className={styles.compactInput}
                          value={responsibility}
                          onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                          placeholder="e.g. Design user interfaces"
                        />
                        {formData.responsibilities.length > 1 && (
                          <button
                            type="button"
                            className={styles.compactRemoveButton}
                            onClick={() => removeResponsibility(index)}
                          >
                            <FiMinus />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.compactAddButton}
                      onClick={addResponsibility}
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Benefits */}
              <div className={styles.compactColumn}>
                <h4 className={styles.compactTitle}>What We Offer</h4>
                <div className={styles.compactGroup}>
                  <label className={styles.compactLabel}>Benefits & Perks</label>
                  <div className={styles.compactListContainer}>
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className={styles.compactRequirementRow}>
                        <input
                          type="text"
                          className={styles.compactInput}
                          value={benefit}
                          onChange={(e) => handleBenefitChange(index, e.target.value)}
                          placeholder="e.g. Health insurance"
                        />
                        {formData.benefits.length > 1 && (
                          <button
                            type="button"
                            className={styles.compactRemoveButton}
                            onClick={() => removeBenefit(index)}
                          >
                            <FiMinus />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.compactAddButton}
                      onClick={addBenefit}
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Update Job' : 'Create Job'}
          </Button>
        </div>
      </form>
    </div>
  );
};
