/**
 * Job Title Standardization Service
 * Maps job title variants to standard O*NET SOC codes and normalized titles
 */

const fs = require('fs');
const path = require('path');

class JobTitleStandardizer {
  constructor() {
    this.titleTaxonomy = this.loadTitleTaxonomy();
    this.titleIndex = this.buildTitleIndex();
    this.seniorityLevels = ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal', 'Staff', 'Director', 'VP', 'C-Level'];
    
    console.log('✅ Job Title Standardizer initialized');
    console.log(`   - ${Object.keys(this.titleIndex).length} job titles loaded`);
  }

  /**
   * Load job title taxonomy with SOC codes
   */
  loadTitleTaxonomy() {
    const taxonomyPath = path.join(__dirname, '../../data/job_title_taxonomy.json');
    
    if (!fs.existsSync(taxonomyPath)) {
      console.log('⚠️  Job title taxonomy not found, creating default...');
      const defaultTaxonomy = this.createDefaultTaxonomy();
      
      const dir = path.dirname(taxonomyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(taxonomyPath, JSON.stringify(defaultTaxonomy, null, 2));
      return defaultTaxonomy;
    }
    
    const data = fs.readFileSync(taxonomyPath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Create default job title taxonomy
   */
  createDefaultTaxonomy() {
    return {
      "Software Development": {
        "Software Developer": {
          soc_code: "15-1252.00",
          variants: [
            "Software Engineer", "Software Dev", "Programmer", "Application Developer",
            "Software Development Engineer", "SDE", "Coder", "Developer"
          ],
          seniority_variants: {
            "Junior": ["Junior Developer", "Junior Software Engineer", "Entry Level Developer"],
            "Mid-Level": ["Software Engineer", "Software Developer"],
            "Senior": ["Senior Developer", "Senior Software Engineer", "Sr. Developer"],
            "Lead": ["Lead Developer", "Lead Engineer", "Tech Lead"],
            "Principal": ["Principal Engineer", "Principal Developer"],
            "Staff": ["Staff Engineer", "Staff Software Engineer"]
          },
          skills: ["Programming", "Software Development", "Problem Solving"],
          industry: "Technology"
        },
        "Full Stack Developer": {
          soc_code: "15-1252.00",
          variants: [
            "Full-Stack Engineer", "Fullstack Developer", "Full Stack Engineer",
            "Full-Stack Developer", "Full Stack Software Engineer"
          ],
          skills: ["Frontend", "Backend", "JavaScript", "Databases"],
          industry: "Technology"
        },
        "Frontend Developer": {
          soc_code: "15-1254.00",
          variants: [
            "Front-End Developer", "Front End Engineer", "UI Developer",
            "Web Developer", "Frontend Engineer", "Client-Side Developer"
          ],
          skills: ["HTML", "CSS", "JavaScript", "React", "Angular", "Vue"],
          industry: "Technology"
        },
        "Backend Developer": {
          soc_code: "15-1252.00",
          variants: [
            "Back-End Developer", "Backend Engineer", "Server-Side Developer",
            "API Developer", "Back End Engineer"
          ],
          skills: ["Node.js", "Python", "Java", "Databases", "APIs"],
          industry: "Technology"
        },
        "Mobile Developer": {
          soc_code: "15-1252.00",
          variants: [
            "Mobile Engineer", "iOS Developer", "Android Developer",
            "Mobile App Developer", "Mobile Application Developer"
          ],
          skills: ["React Native", "Flutter", "Swift", "Kotlin"],
          industry: "Technology"
        }
      },
      "Data & Analytics": {
        "Data Scientist": {
          soc_code: "15-2051.00",
          variants: [
            "Data Science Engineer", "ML Engineer", "Machine Learning Engineer",
            "AI Engineer", "Data Science Specialist"
          ],
          skills: ["Python", "Machine Learning", "Statistics", "Data Analysis"],
          industry: "Technology"
        },
        "Data Analyst": {
          soc_code: "15-2051.01",
          variants: [
            "Business Analyst", "Data Analytics Specialist", "Analytics Engineer",
            "BI Analyst", "Business Intelligence Analyst"
          ],
          skills: ["SQL", "Excel", "Data Visualization", "Tableau"],
          industry: "Technology"
        },
        "Data Engineer": {
          soc_code: "15-1243.00",
          variants: [
            "Big Data Engineer", "ETL Developer", "Data Pipeline Engineer",
            "Data Infrastructure Engineer"
          ],
          skills: ["SQL", "Python", "ETL", "Data Warehousing"],
          industry: "Technology"
        }
      },
      "Design": {
        "UX Designer": {
          soc_code: "27-1021.00",
          variants: [
            "User Experience Designer", "UX/UI Designer", "Product Designer",
            "Interaction Designer", "Experience Designer"
          ],
          skills: ["Figma", "User Research", "Wireframing", "Prototyping"],
          industry: "Design"
        },
        "UI Designer": {
          soc_code: "27-1021.00",
          variants: [
            "User Interface Designer", "Visual Designer", "Interface Designer",
            "Digital Designer"
          ],
          skills: ["Figma", "Adobe XD", "Visual Design", "Typography"],
          industry: "Design"
        },
        "Graphic Designer": {
          soc_code: "27-1024.00",
          variants: [
            "Visual Designer", "Creative Designer", "Brand Designer",
            "Graphics Designer", "Digital Artist"
          ],
          skills: ["Adobe Photoshop", "Illustrator", "InDesign", "Branding"],
          industry: "Design"
        }
      },
      "Management": {
        "Project Manager": {
          soc_code: "11-9199.00",
          variants: [
            "PM", "Program Manager", "Technical Project Manager",
            "IT Project Manager", "Scrum Master", "Agile Project Manager"
          ],
          skills: ["Project Management", "Agile", "Scrum", "Leadership"],
          industry: "Management"
        },
        "Product Manager": {
          soc_code: "11-2021.00",
          variants: [
            "Product Owner", "Technical Product Manager", "Associate Product Manager",
            "APM", "Product Lead"
          ],
          skills: ["Product Strategy", "Roadmapping", "User Stories", "Analytics"],
          industry: "Management"
        },
        "Engineering Manager": {
          soc_code: "11-9041.00",
          variants: [
            "Software Engineering Manager", "Development Manager",
            "Technical Manager", "Team Lead"
          ],
          skills: ["Leadership", "Team Management", "Technical Strategy"],
          industry: "Management"
        }
      },
      "DevOps & Infrastructure": {
        "DevOps Engineer": {
          soc_code: "15-1252.00",
          variants: [
            "Site Reliability Engineer", "SRE", "DevOps Specialist",
            "Infrastructure Engineer", "Platform Engineer", "Cloud Engineer"
          ],
          skills: ["Docker", "Kubernetes", "CI/CD", "AWS", "Linux"],
          industry: "Technology"
        },
        "System Administrator": {
          soc_code: "15-1244.00",
          variants: [
            "Systems Admin", "Sysadmin", "IT Administrator",
            "Network Administrator", "Infrastructure Admin"
          ],
          skills: ["Linux", "Windows Server", "Networking", "Security"],
          industry: "Technology"
        }
      },
      "Quality Assurance": {
        "QA Engineer": {
          soc_code: "15-1253.00",
          variants: [
            "Quality Assurance Engineer", "Test Engineer", "QA Analyst",
            "Software Tester", "Quality Engineer", "SDET"
          ],
          skills: ["Testing", "Automation", "Selenium", "Test Planning"],
          industry: "Technology"
        },
        "QA Automation Engineer": {
          soc_code: "15-1253.00",
          variants: [
            "Test Automation Engineer", "Automation Tester",
            "SDET", "Software Development Engineer in Test"
          ],
          skills: ["Selenium", "Automation", "Python", "Testing Frameworks"],
          industry: "Technology"
        }
      },
      "Security": {
        "Security Engineer": {
          soc_code: "15-1212.00",
          variants: [
            "Cybersecurity Engineer", "Information Security Engineer",
            "Security Analyst", "InfoSec Engineer"
          ],
          skills: ["Security", "Penetration Testing", "Cryptography", "Compliance"],
          industry: "Technology"
        }
      },
      "Marketing & Content": {
        "Content Writer": {
          soc_code: "27-3043.00",
          variants: [
            "Content Creator", "Copywriter", "Technical Writer",
            "Content Specialist", "Writer"
          ],
          skills: ["Writing", "Content Strategy", "SEO", "Editing"],
          industry: "Marketing"
        },
        "Digital Marketing Specialist": {
          soc_code: "11-2021.00",
          variants: [
            "Digital Marketer", "Marketing Specialist", "Online Marketing Specialist",
            "Internet Marketing Specialist"
          ],
          skills: ["SEO", "SEM", "Social Media", "Analytics"],
          industry: "Marketing"
        }
      },
      "Other": {
        "Intern": {
          soc_code: "99-0000.00",
          variants: [
            "Internship", "Student Intern", "Co-op", "Trainee"
          ],
          skills: [],
          industry: "General"
        },
        "Freelancer": {
          soc_code: "99-0000.00",
          variants: [
            "Freelance", "Independent Contractor", "Consultant",
            "Self-Employed", "Contract Worker"
          ],
          skills: [],
          industry: "General"
        }
      }
    };
  }

  /**
   * Build flat index for fast lookup
   */
  buildTitleIndex() {
    const index = {};
    
    for (const [category, titles] of Object.entries(this.titleTaxonomy)) {
      for (const [standardTitle, data] of Object.entries(titles)) {
        // Index standard title
        const key = standardTitle.toLowerCase();
        index[key] = {
          standard: standardTitle,
          category,
          ...data
        };
        
        // Index variants
        if (data.variants) {
          for (const variant of data.variants) {
            index[variant.toLowerCase()] = {
              standard: standardTitle,
              category,
              ...data
            };
          }
        }
        
        // Index seniority variants
        if (data.seniority_variants) {
          for (const [level, variants] of Object.entries(data.seniority_variants)) {
            for (const variant of variants) {
              index[variant.toLowerCase()] = {
                standard: standardTitle,
                seniority: level,
                category,
                ...data
              };
            }
          }
        }
      }
    }
    
    return index;
  }

  /**
   * Standardize job title
   */
  standardize(jobTitle) {
    if (!jobTitle) return null;
    
    const cleaned = this.cleanTitle(jobTitle);
    
    // Extract seniority level
    const { title: baseTitle, seniority } = this.extractSeniority(cleaned);
    
    // Direct lookup
    const key = baseTitle.toLowerCase();
    if (this.titleIndex[key]) {
      const data = this.titleIndex[key];
      return {
        original: jobTitle,
        standard: data.standard,
        seniority: seniority || data.seniority || null,
        soc_code: data.soc_code,
        category: data.category,
        skills: data.skills || [],
        industry: data.industry || 'General',
        confidence: 0.95
      };
    }
    
    // Fuzzy match
    const fuzzyMatch = this.fuzzyMatchTitle(baseTitle);
    if (fuzzyMatch) {
      return {
        original: jobTitle,
        standard: fuzzyMatch.standard,
        seniority: seniority || fuzzyMatch.seniority || null,
        soc_code: fuzzyMatch.soc_code,
        category: fuzzyMatch.category,
        skills: fuzzyMatch.skills || [],
        industry: fuzzyMatch.industry || 'General',
        confidence: 0.75
      };
    }
    
    // Return original with extracted seniority
    return {
      original: jobTitle,
      standard: baseTitle,
      seniority: seniority,
      soc_code: null,
      category: 'Other',
      skills: [],
      industry: 'General',
      confidence: 0.5
    };
  }

  /**
   * Clean job title
   */
  cleanTitle(title) {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\/]/g, '')
      .trim();
  }

  /**
   * Extract seniority level from title
   */
  extractSeniority(title) {
    const patterns = [
      { regex: /\b(intern|internship|trainee|co-?op)\b/i, level: 'Intern' },
      { regex: /\b(junior|jr\.?|entry[\s-]?level|associate)\b/i, level: 'Junior' },
      { regex: /\b(senior|sr\.?)\b/i, level: 'Senior' },
      { regex: /\b(lead|team\s+lead|tech\s+lead)\b/i, level: 'Lead' },
      { regex: /\b(principal|architect)\b/i, level: 'Principal' },
      { regex: /\b(staff)\b/i, level: 'Staff' },
      { regex: /\b(director|head\s+of)\b/i, level: 'Director' },
      { regex: /\b(vp|vice\s+president)\b/i, level: 'VP' },
      { regex: /\b(cto|ceo|cfo|coo|chief)\b/i, level: 'C-Level' }
    ];
    
    for (const { regex, level } of patterns) {
      if (regex.test(title)) {
        // Remove seniority indicator from title
        const cleanedTitle = title.replace(regex, '').replace(/\s+/g, ' ').trim();
        return { title: cleanedTitle, seniority: level };
      }
    }
    
    return { title, seniority: null };
  }

  /**
   * Fuzzy match job title
   */
  fuzzyMatchTitle(title, maxDistance = 3) {
    let bestMatch = null;
    let bestDistance = maxDistance + 1;
    
    const titleLower = title.toLowerCase();
    
    for (const [key, data] of Object.entries(this.titleIndex)) {
      const distance = this.levenshteinDistance(titleLower, key);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = data;
      }
    }
    
    return bestDistance <= maxDistance ? bestMatch : null;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Batch standardize multiple titles
   */
  standardizeBatch(titles) {
    return titles.map(title => this.standardize(title));
  }

  /**
   * Get suggested skills for a job title
   */
  getSuggestedSkills(jobTitle) {
    const standardized = this.standardize(jobTitle);
    return standardized ? standardized.skills : [];
  }

  /**
   * Validate job title - experience alignment
   */
  validateTitleExperienceAlignment(title, yearsOfExperience) {
    const standardized = this.standardize(title);
    if (!standardized || !standardized.seniority) {
      return { valid: true, warning: null };
    }
    
    const seniorityExpectations = {
      'Intern': { min: 0, max: 1 },
      'Junior': { min: 0, max: 3 },
      'Mid-Level': { min: 2, max: 6 },
      'Senior': { min: 5, max: 15 },
      'Lead': { min: 7, max: 20 },
      'Principal': { min: 10, max: 30 },
      'Staff': { min: 10, max: 30 },
      'Director': { min: 10, max: 40 },
      'VP': { min: 15, max: 50 },
      'C-Level': { min: 15, max: 50 }
    };
    
    const expectation = seniorityExpectations[standardized.seniority];
    if (!expectation) {
      return { valid: true, warning: null };
    }
    
    if (yearsOfExperience < expectation.min) {
      return {
        valid: false,
        warning: `${standardized.seniority} positions typically require ${expectation.min}+ years of experience`
      };
    }
    
    if (yearsOfExperience > expectation.max) {
      return {
        valid: true,
        warning: `Experience level may be higher than typical for ${standardized.seniority} position`
      };
    }
    
    return { valid: true, warning: null };
  }
}

module.exports = JobTitleStandardizer;
