/**
 * Skills Ontology Service
 * Provides skill normalization, categorization, and inference using hierarchical taxonomy
 */

const fs = require('fs');
const path = require('path');

class SkillsOntologyService {
  constructor() {
    this.skillsGraph = this.loadSkillsOntology();
    this.skillIndex = this.buildSkillIndex();
    this.synonymMap = this.buildSynonymMap();
    
    console.log('✅ Skills Ontology Service initialized');
    console.log(`   - ${Object.keys(this.skillIndex).length} skills loaded`);
    console.log(`   - ${Object.keys(this.synonymMap).length} synonyms mapped`);
  }

  /**
   * Load skills ontology from JSON file
   */
  loadSkillsOntology() {
    const ontologyPath = path.join(__dirname, '../../data/skills_ontology.json');
    
    // If file doesn't exist, create default ontology
    if (!fs.existsSync(ontologyPath)) {
      console.log('⚠️  Skills ontology not found, creating default...');
      const defaultOntology = this.createDefaultOntology();
      
      // Ensure directory exists
      const dir = path.dirname(ontologyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(ontologyPath, JSON.stringify(defaultOntology, null, 2));
      return defaultOntology;
    }
    
    const data = fs.readFileSync(ontologyPath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Create default skills ontology with common tech skills
   */
  createDefaultOntology() {
    return {
      "Technical Skills": {
        "Programming Languages": {
          "JavaScript": {
            synonyms: ["JS", "ECMAScript", "Javascript"],
            related: ["TypeScript", "Node.js", "React"],
            level: "language",
            category: "programming"
          },
          "TypeScript": {
            synonyms: ["TS"],
            related: ["JavaScript", "Angular", "React"],
            level: "language",
            category: "programming"
          },
          "Python": {
            synonyms: ["Python3", "Py"],
            related: ["Django", "Flask", "Machine Learning"],
            level: "language",
            category: "programming"
          },
          "Java": {
            synonyms: [],
            related: ["Spring", "Hibernate", "Android"],
            level: "language",
            category: "programming"
          },
          "C++": {
            synonyms: ["CPP", "C Plus Plus"],
            related: ["C", "C#"],
            level: "language",
            category: "programming"
          },
          "C#": {
            synonyms: ["CSharp", "C Sharp"],
            related: [".NET", "Unity"],
            level: "language",
            category: "programming"
          },
          "PHP": {
            synonyms: [],
            related: ["Laravel", "WordPress"],
            level: "language",
            category: "programming"
          },
          "Ruby": {
            synonyms: [],
            related: ["Rails", "Ruby on Rails"],
            level: "language",
            category: "programming"
          },
          "Go": {
            synonyms: ["Golang"],
            related: ["Docker", "Kubernetes"],
            level: "language",
            category: "programming"
          },
          "Rust": {
            synonyms: [],
            related: ["WebAssembly"],
            level: "language",
            category: "programming"
          },
          "Swift": {
            synonyms: [],
            related: ["iOS", "Xcode"],
            level: "language",
            category: "programming"
          },
          "Kotlin": {
            synonyms: [],
            related: ["Android", "Java"],
            level: "language",
            category: "programming"
          }
        },
        "Web Development": {
          "Frontend": {
            "React": {
              synonyms: ["React.js", "ReactJS"],
              related: ["JavaScript", "Redux", "Next.js"],
              level: "framework",
              category: "frontend"
            },
            "Angular": {
              synonyms: ["AngularJS", "Angular.js"],
              related: ["TypeScript", "RxJS"],
              level: "framework",
              category: "frontend"
            },
            "Vue": {
              synonyms: ["Vue.js", "VueJS"],
              related: ["JavaScript", "Nuxt.js"],
              level: "framework",
              category: "frontend"
            },
            "HTML": {
              synonyms: ["HTML5"],
              related: ["CSS", "JavaScript"],
              level: "language",
              category: "frontend"
            },
            "CSS": {
              synonyms: ["CSS3", "Cascading Style Sheets"],
              related: ["HTML", "SASS", "Tailwind"],
              level: "language",
              category: "frontend"
            },
            "Tailwind CSS": {
              synonyms: ["Tailwind", "TailwindCSS"],
              related: ["CSS", "React"],
              level: "framework",
              category: "frontend"
            },
            "Bootstrap": {
              synonyms: [],
              related: ["CSS", "HTML"],
              level: "framework",
              category: "frontend"
            }
          },
          "Backend": {
            "Node.js": {
              synonyms: ["NodeJS", "Node"],
              related: ["JavaScript", "Express", "NestJS"],
              level: "runtime",
              category: "backend"
            },
            "Express": {
              synonyms: ["Express.js", "ExpressJS"],
              related: ["Node.js", "JavaScript"],
              level: "framework",
              category: "backend"
            },
            "Django": {
              synonyms: [],
              related: ["Python", "REST API"],
              level: "framework",
              category: "backend"
            },
            "Flask": {
              synonyms: [],
              related: ["Python", "REST API"],
              level: "framework",
              category: "backend"
            },
            "Spring": {
              synonyms: ["Spring Boot", "Spring Framework"],
              related: ["Java", "Hibernate"],
              level: "framework",
              category: "backend"
            },
            "Laravel": {
              synonyms: [],
              related: ["PHP", "MySQL"],
              level: "framework",
              category: "backend"
            },
            "Ruby on Rails": {
              synonyms: ["Rails", "RoR"],
              related: ["Ruby", "PostgreSQL"],
              level: "framework",
              category: "backend"
            }
          }
        },
        "Databases": {
          "SQL": {
            synonyms: ["Structured Query Language"],
            related: ["MySQL", "PostgreSQL", "Database"],
            level: "language",
            category: "database"
          },
          "MySQL": {
            synonyms: [],
            related: ["SQL", "Database"],
            level: "database",
            category: "database"
          },
          "PostgreSQL": {
            synonyms: ["Postgres"],
            related: ["SQL", "Database"],
            level: "database",
            category: "database"
          },
          "MongoDB": {
            synonyms: ["Mongo"],
            related: ["NoSQL", "Database"],
            level: "database",
            category: "database"
          },
          "Redis": {
            synonyms: [],
            related: ["Cache", "NoSQL"],
            level: "database",
            category: "database"
          },
          "Firebase": {
            synonyms: [],
            related: ["NoSQL", "Google Cloud"],
            level: "database",
            category: "database"
          },
          "Supabase": {
            synonyms: [],
            related: ["PostgreSQL", "Firebase"],
            level: "database",
            category: "database"
          }
        },
        "Mobile Development": {
          "React Native": {
            synonyms: ["ReactNative"],
            related: ["React", "JavaScript", "Mobile"],
            level: "framework",
            category: "mobile"
          },
          "Flutter": {
            synonyms: [],
            related: ["Dart", "Mobile"],
            level: "framework",
            category: "mobile"
          },
          "Android": {
            synonyms: ["Android Development"],
            related: ["Java", "Kotlin"],
            level: "platform",
            category: "mobile"
          },
          "iOS": {
            synonyms: ["iOS Development"],
            related: ["Swift", "Xcode"],
            level: "platform",
            category: "mobile"
          }
        },
        "DevOps & Cloud": {
          "Docker": {
            synonyms: [],
            related: ["Kubernetes", "Containerization"],
            level: "tool",
            category: "devops"
          },
          "Kubernetes": {
            synonyms: ["K8s"],
            related: ["Docker", "Cloud"],
            level: "tool",
            category: "devops"
          },
          "AWS": {
            synonyms: ["Amazon Web Services"],
            related: ["Cloud", "EC2", "S3"],
            level: "platform",
            category: "cloud"
          },
          "Azure": {
            synonyms: ["Microsoft Azure"],
            related: ["Cloud", "Microsoft"],
            level: "platform",
            category: "cloud"
          },
          "Google Cloud": {
            synonyms: ["GCP", "Google Cloud Platform"],
            related: ["Cloud"],
            level: "platform",
            category: "cloud"
          },
          "Git": {
            synonyms: [],
            related: ["GitHub", "GitLab", "Version Control"],
            level: "tool",
            category: "devops"
          },
          "GitHub": {
            synonyms: [],
            related: ["Git", "Version Control"],
            level: "platform",
            category: "devops"
          },
          "CI/CD": {
            synonyms: ["Continuous Integration", "Continuous Deployment"],
            related: ["Jenkins", "GitHub Actions"],
            level: "concept",
            category: "devops"
          }
        },
        "Data Science & AI": {
          "Machine Learning": {
            synonyms: ["ML"],
            related: ["Python", "TensorFlow", "PyTorch"],
            level: "field",
            category: "ai"
          },
          "Deep Learning": {
            synonyms: ["DL"],
            related: ["Machine Learning", "Neural Networks"],
            level: "field",
            category: "ai"
          },
          "TensorFlow": {
            synonyms: [],
            related: ["Python", "Machine Learning"],
            level: "framework",
            category: "ai"
          },
          "PyTorch": {
            synonyms: [],
            related: ["Python", "Machine Learning"],
            level: "framework",
            category: "ai"
          },
          "Natural Language Processing": {
            synonyms: ["NLP"],
            related: ["Machine Learning", "BERT"],
            level: "field",
            category: "ai"
          },
          "Computer Vision": {
            synonyms: ["CV"],
            related: ["Machine Learning", "OpenCV"],
            level: "field",
            category: "ai"
          }
        }
      },
      "Soft Skills": {
        "Communication": {
          "Public Speaking": {
            synonyms: ["Presentation Skills"],
            related: ["Communication", "Leadership"],
            level: "skill",
            category: "soft"
          },
          "Written Communication": {
            synonyms: ["Writing", "Technical Writing"],
            related: ["Communication", "Documentation"],
            level: "skill",
            category: "soft"
          },
          "Verbal Communication": {
            synonyms: ["Speaking", "Oral Communication"],
            related: ["Communication", "Interpersonal"],
            level: "skill",
            category: "soft"
          }
        },
        "Leadership": {
          "Team Management": {
            synonyms: ["Team Leadership", "People Management"],
            related: ["Leadership", "Project Management"],
            level: "skill",
            category: "soft"
          },
          "Mentoring": {
            synonyms: ["Coaching", "Training"],
            related: ["Leadership", "Teaching"],
            level: "skill",
            category: "soft"
          }
        },
        "Problem Solving": {
          "Critical Thinking": {
            synonyms: ["Analytical Thinking"],
            related: ["Problem Solving", "Decision Making"],
            level: "skill",
            category: "soft"
          },
          "Creativity": {
            synonyms: ["Innovation", "Creative Thinking"],
            related: ["Problem Solving", "Design"],
            level: "skill",
            category: "soft"
          }
        },
        "Collaboration": {
          "Teamwork": {
            synonyms: ["Team Collaboration", "Team Player"],
            related: ["Collaboration", "Communication"],
            level: "skill",
            category: "soft"
          },
          "Cross-functional Collaboration": {
            synonyms: ["Interdisciplinary Work"],
            related: ["Teamwork", "Communication"],
            level: "skill",
            category: "soft"
          }
        }
      }
    };
  }

  /**
   * Build flat index of all skills for fast lookup
   */
  buildSkillIndex() {
    const index = {};
    
    const traverse = (node, path = []) => {
      for (const [key, value] of Object.entries(node)) {
        if (value && typeof value === 'object') {
          if (value.synonyms !== undefined) {
            // This is a skill node
            index[key.toLowerCase()] = {
              name: key,
              path: [...path, key],
              ...value
            };
          } else {
            // This is a category node
            traverse(value, [...path, key]);
          }
        }
      }
    };
    
    traverse(this.skillsGraph);
    return index;
  }

  /**
   * Build synonym to canonical skill mapping
   */
  buildSynonymMap() {
    const map = {};
    
    for (const [canonical, data] of Object.entries(this.skillIndex)) {
      // Map canonical name to itself
      map[canonical] = data.name;
      
      // Map each synonym to canonical name
      if (data.synonyms) {
        for (const synonym of data.synonyms) {
          map[synonym.toLowerCase()] = data.name;
        }
      }
    }
    
    return map;
  }

  /**
   * Normalize skill name to canonical form
   */
  normalizeSkill(skillName) {
    if (!skillName) return null;
    
    const normalized = skillName.trim().toLowerCase();
    
    // Direct match
    if (this.synonymMap[normalized]) {
      return this.synonymMap[normalized];
    }
    
    // Fuzzy match using Levenshtein distance
    const fuzzyMatch = this.fuzzyMatch(normalized);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }
    
    // Return original if no match found
    return skillName;
  }

  /**
   * Fuzzy match skill name using Levenshtein distance
   */
  fuzzyMatch(skillName, maxDistance = 2) {
    let bestMatch = null;
    let bestDistance = maxDistance + 1;
    
    for (const canonical of Object.keys(this.synonymMap)) {
      const distance = this.levenshteinDistance(skillName, canonical);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = canonical;
      }
    }
    
    return bestDistance <= maxDistance ? this.synonymMap[bestMatch] : null;
  }

  /**
   * Calculate Levenshtein distance between two strings
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
            matrix[i - 1][j - 1] + 1,  // substitution
            matrix[i][j - 1] + 1,      // insertion
            matrix[i - 1][j] + 1       // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get skill details including category and related skills
   */
  getSkillDetails(skillName) {
    const normalized = this.normalizeSkill(skillName);
    if (!normalized) return null;
    
    const key = normalized.toLowerCase();
    return this.skillIndex[key] || null;
  }

  /**
   * Infer related skills based on given skills
   */
  inferRelatedSkills(skills) {
    const relatedSet = new Set();
    
    for (const skill of skills) {
      const details = this.getSkillDetails(skill);
      if (details && details.related) {
        for (const related of details.related) {
          relatedSet.add(related);
        }
      }
    }
    
    // Remove skills that are already in the input
    const normalizedInput = new Set(
      skills.map(s => this.normalizeSkill(s)).filter(Boolean)
    );
    
    return Array.from(relatedSet).filter(s => !normalizedInput.has(s));
  }

  /**
   * Categorize skills into groups
   */
  categorizeSkills(skills) {
    const categories = {
      'Programming Languages': [],
      'Frontend': [],
      'Backend': [],
      'Databases': [],
      'Mobile': [],
      'DevOps & Cloud': [],
      'Data Science & AI': [],
      'Soft Skills': [],
      'Other': []
    };
    
    for (const skill of skills) {
      const details = this.getSkillDetails(skill);
      if (details) {
        const category = details.category || 'Other';
        const categoryKey = this.mapCategoryToKey(category);
        if (categories[categoryKey]) {
          categories[categoryKey].push(details.name);
        } else {
          categories['Other'].push(details.name);
        }
      } else {
        categories['Other'].push(skill);
      }
    }
    
    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, skills]) => skills.length > 0)
    );
  }

  /**
   * Map category to display key
   */
  mapCategoryToKey(category) {
    const mapping = {
      'programming': 'Programming Languages',
      'frontend': 'Frontend',
      'backend': 'Backend',
      'database': 'Databases',
      'mobile': 'Mobile',
      'devops': 'DevOps & Cloud',
      'cloud': 'DevOps & Cloud',
      'ai': 'Data Science & AI',
      'soft': 'Soft Skills'
    };
    
    return mapping[category] || 'Other';
  }

  /**
   * Normalize and deduplicate skill list
   */
  normalizeSkillList(skills) {
    const normalized = new Set();
    
    for (const skill of skills) {
      const canonical = this.normalizeSkill(skill);
      if (canonical) {
        normalized.add(canonical);
      }
    }
    
    return Array.from(normalized);
  }
}

module.exports = SkillsOntologyService;
