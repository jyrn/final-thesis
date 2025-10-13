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
      // Capture school name including location (everything up to newline or next section)
      const schoolMatch = currentLine.match(/^([A-Z][A-Za-z\s,]+(?:University|College|Institute|School|Academy|Lipa|Polytechnic|Colleges)[A-Za-z\s,]*)/);
      if (schoolMatch) {
        // Extract school name and location
        const fullSchoolText = schoolMatch[1].trim();
        const parts = fullSchoolText.split(',').map(p => p.trim());
        const school = parts[0]; // First part is school name
        const location = parts.slice(1).join(', '); // Rest is location
        
        console.log(`🎓 DEBUG Pattern 5A: fullSchoolText="${fullSchoolText}", school="${school}", location="${location}"`);
        
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
        
        if (degreeMatch || school.includes('Colleges') || school.includes('High School')) {
          const degree = degreeMatch ? this.normalizeDegree(degreeMatch[0]) : 'High School';
          
          // Look for date in multiple lines
          let startDate = '', endDate = '';
          
          // Search for date in the lines around the school/degree
          for (let k = i; k < Math.min(i + 6, lines.length); k++) {
            const dateLine = lines[k].trim();
            
            // Try multiple date patterns (with en-dash – or hyphen -)
            // Pattern 1: Month YYYY - Month YYYY (e.g., "August 2018 - May 2020")
            let dateMatch = dateLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–\-]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[4];
              break;
            }
            
            // Pattern 2: Month YYYY - YYYY/Present (e.g., "September 2022 - Present")
            dateMatch = dateLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–\-]\s*(Present|Current|\d{4})/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[3];
              break;
            }
            
            // Pattern 3: YYYY - YYYY or YYYY - Present
            dateMatch = dateLine.match(/(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
            
            // Pattern 4: Check if previous line has month and current has year-range
            if (k > 0) {
              const prevLine = lines[k - 1].trim();
              const monthMatch = prevLine.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
              const yearMatch = dateLine.match(/^(\d{4})\s*[–\-]\s*(Present|Current|\d{4})/i);
              if (monthMatch && yearMatch) {
                startDate = yearMatch[1];
                endDate = yearMatch[2];
                break;
              }
            }
          }
          
          education.push({
            school,
            degree,
            startDate,
            endDate,
            gpa: gpa,
            location: location,
            description: description.trim()
          });
          
          console.log(`🎓 ✅ Found education (Pattern 5A): ${school} - ${degree} (${startDate} - ${endDate}) Location: ${location} GPA: ${gpa}`);
          i = Math.max(degreeLineIndex, i + 2); // Continue from after the degree line or skip at least 2 lines
          continue;
        }
      }
      
      // Pattern B: Degree first, then school (Adrian's format)
      // Also handle case where degree line contains a date: "2022 - Present Senior High School Certificate, STEM"
      let degreeMatch = currentLine.match(/^(Bachelor|Master|Ph\.?D|B\.?S|M\.?S|M\.?A|B\.?A|Associate|Senior High School)[A-Za-z\s,\.]*/i);
      
      // If no match, try to extract degree after a date pattern
      if (!degreeMatch && currentLine.match(/\d{4}\s*[–\-]\s*(Present|Current|\d{4})/)) {
        // Remove the date part and try again
        const withoutDate = currentLine.replace(/^\d{4}\s*[–\-]\s*(Present|Current|\d{4})\s*/, '').trim();
        degreeMatch = withoutDate.match(/^(Senior High School|Bachelor|Master|Associate)[A-Za-z\s,\.]*/i);
        if (degreeMatch && nextLine) {
          const degree = this.normalizeDegree(withoutDate);
          const schoolMatch = nextLine.match(/^([A-Z][A-Za-z\s,]+(?:University|College|Institute|School|Academy|Lipa|Polytechnic|Colleges)[A-Za-z\s,]*)/);
          
          if (schoolMatch) {
            // Extract school name and location
            const fullSchoolText = schoolMatch[1].trim();
            const parts = fullSchoolText.split(',').map(p => p.trim());
            const school = parts[0]; // First part is school name
            const location = parts.slice(1).join(', '); // Rest is location
            
            console.log(`🎓 DEBUG Pattern 5B-alt: fullSchoolText="${fullSchoolText}", school="${school}", location="${location}"`);
            
            // Look for date in next lines (NOT from current line, as that date belongs to a different education)
            let startDate = '', endDate = '';
            
            // Search in next lines for the date that belongs to THIS education entry
            {
              for (let j = i + 2; j < Math.min(i + 6, lines.length); j++) {
                const dateLine = lines[j].trim();
                
                // Pattern 1: Month YYYY - Month YYYY (with en-dash or hyphen)
                let dateMatch = dateLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–\-]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
                if (dateMatch) {
                  startDate = dateMatch[2];
                  endDate = dateMatch[4];
                  break;
                }
                
                // Pattern 2: Month YYYY - YYYY/Present on same line
                dateMatch = dateLine.match(/(September|August|January|February|March|April|May|June|July|October|November|December)\s+(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
                if (dateMatch) {
                  startDate = dateMatch[2];
                  endDate = dateMatch[3];
                  break;
                }
                
                // Pattern 3: Just YYYY - YYYY/Present (with en-dash or hyphen)
                dateMatch = dateLine.match(/^(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
                if (dateMatch) {
                  startDate = dateMatch[1];
                  endDate = dateMatch[2];
                  break;
                }
              }
            }
            
            education.push({
              school,
              degree,
              startDate,
              endDate,
              gpa: '',
              location: location,
              description: ''
            });
            
            console.log(`🎓 ✅ Found education (Pattern 5B-alt): ${school} - ${degree} (${startDate} - ${endDate}) Location: ${location}`);
            i += 2; // Skip processed lines
            continue;
          }
        }
      }
      
      if (degreeMatch && nextLine) {
        const degree = this.normalizeDegree(currentLine);
        const schoolMatch = nextLine.match(/^([A-Z][A-Za-z\s,]+(?:University|College|Institute|School|Academy|Lipa|Polytechnic|Colleges)[A-Za-z\s,]*)/);
        
        if (schoolMatch) {
          // Extract school name and location
          const fullSchoolText = schoolMatch[1].trim();
          const parts = fullSchoolText.split(',').map(p => p.trim());
          const school = parts[0]; // First part is school name
          const location = parts.slice(1).join(', '); // Rest is location
          
          console.log(`🎓 DEBUG Pattern 5B: fullSchoolText="${fullSchoolText}", school="${school}", location="${location}"`);
          
          // Look for date in next lines
          let startDate = '', endDate = '';
          for (let j = i + 2; j < Math.min(i + 6, lines.length); j++) {
            const dateLine = lines[j].trim();
            
            // Pattern 1: Month YYYY - Month YYYY (with en-dash or hyphen)
            let dateMatch = dateLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–\-]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[4];
              break;
            }
            
            // Pattern 2: Month YYYY - YYYY/Present on same line
            dateMatch = dateLine.match(/(September|August|January|February|March|April|May|June|July|October|November|December)\s+(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[3];
              break;
            }
            
            // Pattern 3: Just YYYY - YYYY/Present (with en-dash or hyphen)
            dateMatch = dateLine.match(/^(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
            
            // Pattern 4: Month on previous line, year-range on current line
            if (j > 0) {
              const prevLine = lines[j - 1].trim();
              const monthMatch = prevLine.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
              const yearMatch = dateLine.match(/^(\d{4})\s*[–\-]\s*(Present|Current|\d{4})/i);
              if (monthMatch && yearMatch) {
                startDate = yearMatch[1];
                endDate = yearMatch[2];
                break;
              }
            }
          }
          
          education.push({
            school,
            degree,
            startDate,
            endDate,
            gpa: '',
            location: location,
            description: ''
          });
          
          console.log(`🎓 ✅ Found education (Pattern 5B): ${school} - ${degree} (${startDate} - ${endDate}) Location: ${location}`);
          i += 2; // Skip processed lines
        }
      }
    }
    
    // Pattern 6: Date-first format "YYYY - YYYY School Name, Degree"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip lines that start with "Present" - these are not school names
      if (line.startsWith('Present ')) {
        continue;
      }
      
      // Look for lines that contain school names and dates (more flexible pattern)
      const schoolMatch = line.match(/([A-Z][A-Za-z\s,]+(?:Colleges|University|College|Institute|School|Academy))/);
      if (schoolMatch) {
        // Remove location (everything after first comma)
        let school = schoolMatch[1].split(',')[0].trim();
        
        // Skip if school name is just "Senior High School" without a proper institution name
        if (school === 'Senior High School') {
          continue;
        }
        
        // Look for dates in this line or nearby lines
        let startDate = '';
        let endDate = '';
        
        // First, try to find date on the CURRENT line AFTER the school name
        // Extract the part of the line after the school name
        const schoolIndex = line.indexOf(school);
        if (schoolIndex !== -1) {
          const afterSchool = line.substring(schoolIndex + school.length);
          const currentLineDateMatch = afterSchool.match(/(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)/i);
          if (currentLineDateMatch) {
            startDate = currentLineDateMatch[1];
            endDate = currentLineDateMatch[2];
          }
        }
        
        // If no date found on current line, check next few lines (with en-dash – or hyphen -)
        if (!startDate) {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const dateLine = lines[j].trim();
            
            // Pattern 1: Month YYYY - Month YYYY (e.g., "August 2018 - May 2020")
            let dateMatch = dateLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–\-]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
            if (dateMatch) {
              startDate = dateMatch[2];
              endDate = dateMatch[4];
              break;
            }
            
            // Pattern 2: YYYY - YYYY (with en-dash or hyphen)
            dateMatch = dateLine.match(/(\d{4})\s*[–\-]\s*(\d{4})/);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              break;
            }
            
            // Pattern 3: YYYY - Present (with en-dash or hyphen)
            dateMatch = dateLine.match(/(\d{4})\s*[–\-]\s*(Present|Current)/i);
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
          
          // Look for degree in previous line (might be "Senior High School Certificate, STEM")
          if (i > 0) {
            const prevLine = lines[i - 1].trim();
            if (prevLine.includes('Senior High School') || prevLine.includes('Certificate') || prevLine.includes('STEM')) {
              // Extract degree from previous line, removing date patterns
              const degreeText = prevLine.replace(/\d{4}\s*-\s*(Present|Current|\d{4})/i, '').trim();
              if (degreeText.length > 5 && degreeText.length < 100) {
                degree = degreeText;
              }
            }
          }
          
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
    
    // Remove duplicates - keep only unique schools
    const uniqueEducation = [];
    const seenSchools = new Set();
    
    for (const edu of education) {
      // Create a normalized school key for comparison
      const schoolKey = edu.school.toLowerCase().replace(/[,\s]+/g, '');
      
      // Skip if we've already seen this school
      if (seenSchools.has(schoolKey)) {
        console.log('🎓 ⚠️ Skipping duplicate:', edu.school);
        continue;
      }
      
      // Skip entries with invalid or placeholder school names
      if (edu.school === 'Present Senior High School' || 
          edu.school === 'Senior High School' ||
          edu.school.startsWith('Present ')) {
        console.log('🎓 ⚠️ Skipping invalid school name:', edu.school);
        continue;
      }
      
      seenSchools.add(schoolKey);
      uniqueEducation.push(edu);
    }
    
    this.confidence = uniqueEducation.length > 0 ? 0.85 : 0;
    
    console.log('🎓 EducationParser: Extraction complete (confidence:', this.confidence.toFixed(2), ')');
    console.log('🎓 Total entries found:', education.length, '| Unique entries:', uniqueEducation.length);
    
    return { data: uniqueEducation, confidence: this.confidence };
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
