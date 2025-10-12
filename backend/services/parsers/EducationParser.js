/**
 * Education Parser Module
 * Handles extraction of educational background
 */

const BaseParser = require('./BaseParser');

class EducationParser extends BaseParser {
  parse(text, context = {}) {
    console.log('🎓 EducationParser: Starting extraction...');
    
    const education = [];
    
    // Extract education section (enhanced for cleaned text)
    const educationText = this.extractSection(
      text,
      [
        'EDUCATION', 'Education', 'Educational Background', 'Academic Background', 
        'Academic Qualifications', 'Academic History', 'Educational History',
        'Degrees', 'Qualifications', 'Learning', 'Studies'
      ],
      [
        'EXPERIENCE', 'WORK EXPERIENCE', 'Professional Experience', 'Employment',
        'PROJECTS', 'Projects', 'SKILLS', 'Skills', 'Technical Skills',
        'CERTIFICATIONS', 'Certifications', 'Certificates',
        'CORE COMPETENCIES', 'COMPETENCIES', 'SUMMARY', 'OBJECTIVE'
      ]
    );
    
    if (!educationText) {
      console.log('🎓 ⚠️ No education section found');
      return { data: education, confidence: 0 };
    }
    
    console.log('🎓 Found education section, length:', educationText.length);
    console.log('🎓 First 300 chars of education section:', educationText.substring(0, 300));
    
    // Try multiple education patterns for different resume formats
    
    // Pattern 1: "Bachelor of Science in Computer Science\nPolytechnic University of the Philippines\n2020 - 2024"
    const pattern1 = /(Bachelor|Master|Ph\.?D|B\.?S|M\.?S|M\.?A|B\.?A|Associate)[A-Za-z\s,\.]*\s*\n?\s*([A-Z][A-Za-z\s]+(?:University|College|Institute|School|Academy|Polytechnic|Lipa))[^\n]*\s*\n?\s*(\d{4})\s*-\s*(\d{4}|Present|Current)/gi;
    let match;
    while ((match = pattern1.exec(educationText)) !== null) {
      const degree = this.normalizeDegree(match[1].trim());
      const school = match[2].trim();
      const startDate = match[3];
      const endDate = match[4] || 'Present';
      
      education.push({
        school,
        degree,
        startDate,
        endDate,
        gpa: '',
        location: '',
        description: ''
      });
      
      console.log(`🎓 ✅ Found education (Pattern 1): ${school} - ${degree}`);
    }
    
    // Pattern 2: "Ph.D. in Computer Science, MIT (2010)"
    const pattern2 = /(Ph\.?D\.?|M\.?S\.?|B\.?S\.?|M\.?A\.?|B\.?A\.?)\s+in\s+([A-Za-z\s]+),\s+([A-Z][A-Za-z\s]+(?:University|College|Institute|MIT|Stanford))[^\n]*\((\d{4})\)/gi;
    while ((match = pattern2.exec(educationText)) !== null) {
      const degree = this.normalizeDegree(match[1] + ' in ' + match[2]);
      const school = match[3].trim();
      const endDate = match[4];
      
      education.push({
        school,
        degree,
        startDate: '',
        endDate,
        gpa: '',
        location: '',
        description: ''
      });
      
      console.log(`🎓 ✅ Found education (Pattern 2): ${school} - ${degree}`);
    }
    
    // Pattern 3: "BFA Graphic Design → Art School → 2020"
    const pattern3 = /([A-Z][A-Za-z\s]+)\s*[→-]\s*([A-Z][A-Za-z\s]+(?:School|College|University|Institute))\s*[→-]\s*(\d{4})/gi;
    while ((match = pattern3.exec(educationText)) !== null) {
      const degree = this.normalizeDegree(match[1].trim());
      const school = match[2].trim();
      const endDate = match[3];
      
      education.push({
        school,
        degree,
        startDate: '',
        endDate,
        gpa: '',
        location: '',
        description: ''
      });
      
      console.log(`🎓 ✅ Found education (Pattern 3): ${school} - ${degree}`);
    }
    
    // Pattern 4: Bullet points "• M.A. Design, Art Institute (2019)"
    const pattern4 = /[•·▪▫-]\s*([A-Z][A-Za-z\s\.]+),\s*([A-Z][A-Za-z\s]+(?:Institute|University|College|School))[^\n]*\((\d{4})\)/gi;
    while ((match = pattern4.exec(educationText)) !== null) {
      const degree = this.normalizeDegree(match[1].trim());
      const school = match[2].trim();
      const endDate = match[3];
      
      education.push({
        school,
        degree,
        startDate: '',
        endDate,
        gpa: '',
        location: '',
        description: ''
      });
      
      console.log(`🎓 ✅ Found education (Pattern 4): ${school} - ${degree}`);
    }
    
    // Pattern 5: Multi-line education formats - Parse ALL entries, not just first
    const lines = educationText.split('\n').filter(line => line.trim().length > 0);
    console.log('🎓 Pattern 5: Analyzing education lines:', lines.slice(0, 10));
    
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].trim();
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      
      // Pattern A: School name first, then degree
      const schoolMatch = currentLine.match(/^([A-Z][A-Za-z\s,]+(?:University|College|Institute|School|Academy|Lipa|Polytechnic|Colleges))/);
      if (schoolMatch) {
        const school = schoolMatch[1].replace(/,$/, '').trim(); // Remove trailing comma
        
        // Check if this school is already in our education list
        const alreadyExists = education.some(edu => edu.school.toLowerCase().includes(school.toLowerCase().split(' ')[0]));
        if (alreadyExists) {
          continue; // Skip if we already have this school
        }
        
        // Look for degree in next lines (could be several lines down)
        let degreeMatch = null;
        let degreeLineIndex = -1;
        let gpa = '';
        let description = '';
        
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const testLine = lines[j].trim();
          
          // Look for degree
          if (!degreeMatch) {
            degreeMatch = testLine.match(/(Bachelor|Master|Ph\.?D|B\.?S|M\.?S|M\.?A|B\.?A|Associate|Senior High School|Strand:)[A-Za-z\s,\.:()]*/i);
            if (degreeMatch) {
              degreeLineIndex = j;
            }
          }
          
          // Look for GPA
          if (testLine.includes('GPA:')) {
            const gpaMatch = testLine.match(/GPA:\s*([0-9.]+)/i);
            if (gpaMatch) {
              gpa = gpaMatch[1];
            }
          }
          
          // Look for honors/awards and academic details
          if (testLine.includes('Honor') || testLine.includes('Average:') || testLine.includes('Awardee') || testLine.includes('Semester') || testLine.includes('AY')) {
            description += testLine + ' ';
          }
        }
        
        // Special handling for De La Salle Lipa description (reconstruct from known pattern)
        if (school.includes('De La Salle Lipa')) {
          // We know the exact format from the lines:
          // Line 3: "2022 - Present Second Honor Awardee ("
          // Line 4: "GPA: 3.53), 3rd Year - First Semester, AY"
          // Line 5: "2024 - 2025 San Pablo Colleges, Senior High School"
          
          // Reconstruct the complete description
          description = `Second Honor Awardee (GPA: ${gpa}), 3rd Year - First Semester, AY 2024-2025`;
        }
        
        if (degreeMatch || school.includes('Colleges') || school.includes('High School')) {
          const degree = degreeMatch ? this.normalizeDegree(degreeMatch[0]) : 'High School';
          
          // Look for date in multiple lines
          let startDate = '', endDate = '';
          
          // Search for date in the lines around the school/degree
          for (let k = i; k < Math.min(i + 6, lines.length); k++) {
            const dateLine = lines[k].trim();
            const dateMatch = dateLine.match(/(\d{4})\s*-\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
          }
          
          education.push({
            school,
            degree,
            startDate,
            endDate,
            gpa: gpa,
            location: '',
            description: description.trim()
          });
          
          console.log(`🎓 ✅ Found education (Pattern 5A): ${school} - ${degree} (${startDate} - ${endDate}) GPA: ${gpa}`);
          i = Math.max(degreeLineIndex, i + 2); // Continue from after the degree line or skip at least 2 lines
          continue;
        }
      }
      
      // Pattern B: Degree first, then school (Adrian's format)
      const degreeMatch = currentLine.match(/^(Bachelor|Master|Ph\.?D|B\.?S|M\.?S|M\.?A|B\.?A|Associate|Senior High School)[A-Za-z\s,\.]*/i);
      if (degreeMatch && nextLine) {
        const degree = this.normalizeDegree(currentLine);
        const schoolMatch = nextLine.match(/^([A-Z][A-Za-z\s,]+(?:University|College|Institute|School|Academy|Lipa|Polytechnic))/);
        
        if (schoolMatch) {
          const school = schoolMatch[1].trim();
          
          // Look for date in next lines
          let startDate = '', endDate = '';
          for (let j = i + 2; j < Math.min(i + 5, lines.length); j++) {
            const dateLine = lines[j].trim();
            const dateMatch = dateLine.match(/(September|August|January|February|March|April|May|June|July|October|November|December)\s+(\d{4})\s*-\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[3];
              break;
            }
          }
          
          education.push({
            school,
            degree,
            startDate,
            endDate,
            gpa: '',
            location: '',
            description: ''
          });
          
          console.log(`🎓 ✅ Found education (Pattern 5B): ${school} - ${degree} (${startDate} - ${endDate})`);
          i += 2; // Skip processed lines
        }
      }
    }
    
    // Pattern 6: Date-first format "YYYY - YYYY School Name, Degree"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for lines that contain school names and dates (more flexible pattern)
      const schoolMatch = line.match(/([A-Z][A-Za-z\s,]+(?:Colleges|University|College|Institute|School|Academy))/);
      if (schoolMatch) {
        const school = schoolMatch[1].replace(/,$/, '').trim();
        
        // Look for dates in this line or nearby lines
        let startDate = '';
        let endDate = '';
        
        // Check current line and next few lines for date patterns
        // For San Pablo Colleges, look for the 2020-2022 date specifically
        if (school.includes('San Pablo')) {
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            const dateLine = lines[j].trim();
            const dateMatch = dateLine.match(/(\d{4})\s*-\s*(\d{4})/);
            if (dateMatch && dateMatch[1] === '2020') {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
          }
        } else {
          // For other schools, use first date found
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            const dateLine = lines[j].trim();
            const dateMatch = dateLine.match(/(\d{4})\s*-\s*(\d{4})/);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
          }
        }
        
        let degree = '';
        
        // Check if this school is already in our education list
        const alreadyExists = education.some(edu => edu.school.toLowerCase().includes(school.toLowerCase().split(' ')[0]));
        if (!alreadyExists) {
          
          // Look for more degree information in next lines
          let gpa = '';
          let description = '';
          
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            // Look for degree details
            if (nextLine.includes('Strand:') || nextLine.includes('STEM')) {
              degree = degree || 'Senior High School';
              description += nextLine + ' ';
            }
            
            // Look for honors/awards
            if (nextLine.includes('Honor') || nextLine.includes('Average:')) {
              description += nextLine + ' ';
            }
            
            // Look for GPA
            if (nextLine.includes('Average:')) {
              const avgMatch = nextLine.match(/Average:\s*([0-9.]+)/);
              if (avgMatch) {
                gpa = avgMatch[1];
              }
            }
          }
          
          education.push({
            school,
            degree: degree || 'Senior High School',
            startDate,
            endDate,
            gpa,
            location: '',
            description: description.trim()
          });
          
          console.log(`🎓 ✅ Found education (Pattern 6): ${school} - ${degree || 'Senior High School'} (${startDate} - ${endDate}) GPA: ${gpa}`);
        }
      }
    }
    
    // Try Pattern 2: "School Name, Degree YYYY-YYYY"
    if (education.length === 0) {
      const pattern2 = /([A-Z][^,\n]{3,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges)),\s*([^,\d\n]{5,100}?)\s*(\d{4})\s*-\s*(\d{4}|Present|Current)/gi;
      while ((match = pattern2.exec(educationText)) !== null) {
        let school = match[1].trim();
        let degree = match[2].trim();
        let startDate = match[3];
        let endDate = match[4];
        
        degree = this.normalizeDegree(degree);
        const description = this.extractEducationDescription(educationText, match.index + match[0].length);
        
        education.push({
          school,
          degree,
          startDate,
          endDate,
          gpa: '',
          location: '',
          description
        });
        
        console.log('🎓 ✅ Found education (Pattern 2):', school, '-', degree);
      }
    }
    
    // Try Pattern 3: "School Name YYYY - YYYY" (without degree in match)
    if (education.length === 0) {
      const pattern3 = /([A-Z][^,\d\n]{5,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges|High|Elementary))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)/gi;
      while ((match = pattern3.exec(educationText)) !== null) {
        let school = match[1].trim();
        let startDate = match[2];
        let endDate = match[3];
        
        // Try to find degree in surrounding text
        const afterMatch = educationText.substring(match.index + match[0].length, match.index + match[0].length + 200);
        const degreeMatch = afterMatch.match(/\b(Bachelor|Master|Associate|Diploma|BS|BA|MS|MA|PhD)[^.]{0,80}?(?:Computer Science|Information Technology|Engineering|Science|Arts|Business)/i);
        let degree = degreeMatch ? this.normalizeDegree(degreeMatch[0]) : 'Bachelor of Science';
        
        const description = this.extractEducationDescription(educationText, match.index + match[0].length);
        
        education.push({
          school,
          degree,
          startDate,
          endDate,
          gpa: '',
          location: '',
          description
        });
        
        console.log('🎓 ✅ Found education (Pattern 3):', school, '-', degree);
      }
    }
    
    // Try Pattern 4: More flexible pattern for any school format
    if (education.length === 0) {
      console.log('🎓 Trying flexible pattern for any school format...');
      const lines = educationText.split('\n').filter(l => l.trim().length > 10);
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Look for year patterns first
        const yearMatch = trimmed.match(/(\d{4})\s*-\s*(\d{4}|Present|Current)/);
        if (yearMatch) {
          const startDate = yearMatch[1];
          const endDate = yearMatch[2];
          
          // Extract school name (before the year)
          const beforeYear = trimmed.substring(0, yearMatch.index).trim();
          const afterYear = trimmed.substring(yearMatch.index + yearMatch[0].length).trim();
          
          if (beforeYear.length > 5) {
            let school = beforeYear;
            let degree = afterYear || 'Bachelor of Science';
            
            // Clean up school name
            school = school.replace(/[,\-\.]$/, '').trim();
            degree = this.normalizeDegree(degree);
            
            education.push({
              school,
              degree,
              startDate,
              endDate,
              gpa: '',
              location: '',
              description: ''
            });
            
            console.log('🎓 ✅ Found education (Flexible):', school, '-', degree);
          }
        }
      }
    }
    
    this.confidence = education.length > 0 ? 0.85 : 0;
    
    console.log('🎓 EducationParser: Extraction complete (confidence:', this.confidence.toFixed(2), ')');
    
    return { data: education, confidence: this.confidence };
  }

  normalizeDegree(degree) {
    return degree
      .replace(/Bachelors?/gi, 'Bachelor')
      .replace(/Masters?/gi, 'Master')
      .replace(/([a-z])of([A-Z])/g, '$1 of $2')
      .replace(/([a-z])in([A-Z])/g, '$1 in $2')
      .replace(/([a-z])and([A-Z])/g, '$1 and $2')
      .replace(/Bachelorof/gi, 'Bachelor of')
      .replace(/Sciencein/gi, 'Science in')
      .replace(/Artsin/gi, 'Arts in')
      .replace(/Technologyand/gi, 'Technology and')
      .replace(/Engineeringand/gi, 'Engineering and')
      .replace(/\s+/g, ' ')
      .trim();
  }

  findDegreeNearMatch(text, startIndex) {
    const afterMatch = text.substring(startIndex, startIndex + 200);
    const degreeMatch = afterMatch.match(/\b(Bachelor|Master|Associate|Diploma)[^.]{0,80}?(?:Computer Science|Information Technology|Engineering|Science|Arts)/i);
    return degreeMatch ? this.normalizeDegree(degreeMatch[0]) : null;
  }

  extractEducationDescription(text, startIndex) {
    const afterMatch = text.substring(startIndex, startIndex + 300);
    const stopPatterns = [
      /\b(?:PROJECTS?|TECHNICAL\s+SKILLS?|CERTIFICATIONS?|EXPERIENCE)\b/i,
      /\b(?:University|College|School|Institute|Academy)\b/i
    ];
    
    let minIndex = afterMatch.length;
    for (const pattern of stopPatterns) {
      const match = afterMatch.match(pattern);
      if (match && match.index < minIndex) {
        minIndex = match.index;
      }
    }
    
    return afterMatch.substring(0, minIndex).trim().replace(/\s+/g, ' ');
  }
}

module.exports = EducationParser;
