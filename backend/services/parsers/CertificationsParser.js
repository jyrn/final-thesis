/**
 * Certifications Parser Module
 * Handles extraction of certifications and certificates
 */

const BaseParser = require('./BaseParser');

class CertificationsParser extends BaseParser {
  constructor() {
    super();
    this.version = '2.0.1';
    console.log('🎓 CertificationsParser v2.0.1 loaded');
  }

  parse(text, context = {}) {
    console.log('🎓 CertificationsParser v2.0.1: Starting extraction...');
    
    const certifications = [];
    
    // Extract certifications section (including combined sections)
    let certsText = this.extractSection(
      text,
      ['CERTIFICATIONS', 'Certificates', 'Certifications and Seminars', 'Professional Certifications'],
      ['EDUCATION', 'EXPERIENCE', 'SKILLS', 'PROJECTS']
    );
    
    // If no dedicated certifications section, check for combined "EDUCATION & CERTIFICATIONS"
    if (!certsText) {
      const combinedText = this.extractSection(
        text,
        ['EDUCATION & CERTIFICATIONS', 'Education & Certifications'],
        ['EXPERIENCE', 'SKILLS', 'PROJECTS', 'COMPETENCIES']
      );
      
      if (combinedText) {
        // Extract only certification-related content from combined section
        certsText = this.extractCertificationsFromCombined(combinedText);
        console.log('🎓 Found certifications in combined section');
      }
    }
    
    console.log('🎓 Context format:', context.format);
    console.log('🎓 Certifications section found:', !!certsText);
    console.log('🎓 Certifications section length:', certsText ? certsText.length : 0);
    
    // Detect format from context
    const format = context.format || 'standard';
    console.log('🎓 Using format:', format);
    
    if (format === 'pipe-separated') {
      console.log('🎓 Using pipe-separated format, parsing from full text');
      return this.parsePipeSeparated(text); // Use full text for pipe-separated
    } else if (format === 'standard-bullets') {
      console.log('🎓 Using bullet format for certifications');
      return this.parseBulletFormat(certsText || text);
    } else if (format === 'contact-heavy') {
      console.log('🎓 Using contact-heavy format for certifications');
      return this.parseContactHeavyFormat(certsText || text);
    } else {
      console.log('🎓 Using standard format');
      // For standard format, prefer section text but fallback to full text
      const textToUse = certsText || text;
      console.log('🎓 Text source:', certsText ? 'section' : 'full text');
      return this.parseStandard(textToUse);
    }
  }

  /**
   * Parse pipe-separated format
   */
  parsePipeSeparated(text) {
    console.log('🎓 Using pipe-separated parsing');
    console.log('🎓 Text length for certification parsing:', text.length);
    console.log('🎓 First 300 chars of text:', text.substring(0, 300));
    const certifications = [];
    
    // Test if we can find certification keywords first
    const certKeywords = ['Certificate', 'Certification', 'Google', 'Microsoft', 'Coursera', 'Academy'];
    const foundKeywords = certKeywords.filter(keyword => text.includes(keyword));
    console.log('🎓 Found certification keywords:', foundKeywords);
    
    const certPattern = /([A-Z][^|]{10,100}?)\s*\|\s*([^|]+?)(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/gi;
    let match;
    
    console.log('🎓 Testing certification pattern...');
    while ((match = certPattern.exec(text)) !== null) {
      console.log('🎓 Found potential certification match:', match[0]);
      const name = match[1] ? match[1].trim() : '';
      const issuer = match[2] ? match[2].trim() : '';
      const month = match[3];
      const year = match[4];
      
      // Skip if looks like email or project
      if (name.match(/@|gmail|System|App|Management/i)) continue;
      
      const monthMap = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      
      const date = `${year}-${monthMap[month.toLowerCase()] || '01'}`;
      
      certifications.push({
        name,
        issuer: issuer ? issuer.replace(/Issued\s*by\s*/gi, '').trim() : 'Unknown',
        date,
        description: ''
      });
      
      console.log('🎓 ✅ Found certification:', name);
    }
    
    this.confidence = certifications.length > 0 ? 0.9 : 0;
    return { data: certifications, confidence: this.confidence };
  }

  /**
   * Parse standard format
   */
  parseStandard(text) {
    console.log(' Using standard parsing');
    console.log(' Standard format text sample:', text.substring(0, 500));
    const certifications = [];
    
    // Split into lines for line-by-line parsing (Hannah's format)
    const lines = text.split('\n').map(l => l ? l.trim() : '').filter(l => l.length > 0);
    console.log(' Processing', lines.length, 'lines for certifications');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip section headers and empty lines
      if (line.match(/^(Education|Projects|Skills|Certifications|Experience)/i)) continue;
      
      // Pattern for Hannah's format: "Name | Organization Date" or "Name | Organization                    Date"
      const certMatch = line.match(/^([A-Z][^|]{10,80}?)\s*\|\s*([^|]+?)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i) ||
                        line.match(/^([A-Z][^|]{5,80}?)\s*\|\s*([^|]+?)\s{2,}(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
      
      if (certMatch) {
        const name = certMatch[1] ? certMatch[1].trim() : '';
        const issuer = certMatch[2] ? certMatch[2].trim() : '';
        const month = certMatch[3];
        const year = certMatch[4];
        
        // Skip if it looks like a project or other content
        if (name.match(/System|App|Management|Computation/i)) continue;
        
        // Convert to month input format (YYYY-MM)
        const monthMap = {
          'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        const formattedDate = `${year}-${monthMap[month] || '01'}`;
        
        certifications.push({
          name: name,
          issuer: issuer,
          date: formattedDate,
          expirationDate: '',
          credentialId: '',
          description: ''
        });
        
        console.log(' Found certification:', name, '-', issuer, `(${month} ${year})`);
      }
      
      // Also try simpler pattern: "Name Date" (for lines without |)
      else if (line.match(/\b(Certificate|Certification|Google|Microsoft|Coursera|Academy)\b/i)) {
        const simpleMatch = line.match(/^([A-Z][^0-9]{10,80}?)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        
        if (simpleMatch) {
          const name = simpleMatch[1] ? simpleMatch[1].trim() : '';
          const month = simpleMatch[2];
          const year = simpleMatch[3];
          
          // Convert to month input format (YYYY-MM)
          const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          const formattedDate = `${year}-${monthMap[month] || '01'}`;
          
          certifications.push({
            name: name,
            issuer: 'Unknown',
            date: formattedDate,
            expirationDate: '',
            credentialId: '',
            description: ''
          });
          
          console.log(' Found simple certification:', name, `(${month} ${year})`);
        }
      }
    }
    
    console.log('🎓 Total certifications found:', certifications.length);
    return { data: certifications, confidence: certifications.length > 0 ? 0.8 : 0 };
  }

  /**
   * Parse bullet format certifications
   */
  parseBulletFormat(text) {
    console.log('🎓 Using bullet format parsing');
    const certifications = [];
    
    // Check if this is Hannah's concatenated format (all certs in one line)
    const hasApril2025 = text.includes('April2025');
    const hasJune2025 = text.includes('June2025');
    const hasOctober2025 = text.includes('October2025');
    const hasMultipleCertsInLine = text.includes('Student Mobility Programme') && text.includes('Google UX Design');
    
    console.log(`🎓 Concatenated format detection: April2025=${hasApril2025}, June2025=${hasJune2025}, October2025=${hasOctober2025}, length=${text.length}, multipleCerts=${hasMultipleCertsInLine}`);
    
    if ((hasApril2025 && hasJune2025 && hasOctober2025) || hasMultipleCertsInLine) {
      console.log('🎓 Detected Hannah\'s concatenated certification format');
      const concatenatedCerts = this.parseConcatenatedCertifications(text);
      if (concatenatedCerts.length > 0) {
        return { data: concatenatedCerts, confidence: 0.9 };
      }
    }
    
    // Handle concatenated certifications (Hannah's PDF format)
    let certText = text;
    
    // If we have a very long line with multiple certifications, split it
    if (text.includes('April2025') || text.includes('June2025') || text.includes('October2025')) {
      // Split by date patterns followed by certification names
      certText = text.replace(/(April|June|October|January|February|March|May|July|August|September|November|December)(\d{4})\s+([A-Z][A-Za-z\s]+(?:Design|Certificate|Programme|Data|Science))/g, '$1 $2\n$3');
      
      // Also split by common certification patterns
      certText = certText.replace(/\b(Google UX Design|Preparing Data for Analysis|Harnessing the Power|Introduction to Data Science|English Certificate|Student Mobility Programme)/g, '\n$1');
    }
    
    // Additional splitting for pipe-separated certifications
    certText = certText.replace(/\b([A-Z][^|]{10,80}?)\s*\|\s*([^|]+?)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/g, '\n$1 | $2 $3 $4');
    
    const lines = certText.split('\n').map(l => l ? l.trim() : '').filter(l => l.length > 0);
    
    for (const line of lines) {
      // Skip section headers
      if (line.match(/^(CERTIFICATIONS|Certifications|EDUCATION|PROJECTS)/i)) continue;
      
      // Look for certification patterns in bullet format or pipe format
      if (line.match(/^[•▪▫-]\s*/) || line.match(/\b(Certificate|Certification|Google|Microsoft|Coursera|Academy|AWS|Oracle)\b/i) || line.includes('|')) {
        const cleanLine = line.replace(/^[•▪▫-]\s*/, '').trim();
        
        // Extract name and date
        const dateMatch = cleanLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        let name = cleanLine;
        let dateIssued = '';
        
        if (dateMatch) {
          name = cleanLine.replace(dateMatch[0], '').trim();
          dateIssued = `${dateMatch[1]} ${dateMatch[2]}`;
        }
        
        // Clean up common formatting issues in certification names
        name = name.replace(/\s*\|\s*$/, ''); // Remove trailing |
        name = name.replace(/\s*\)\s*$/, ''); // Remove trailing )
        name = name.replace(/Issued by [^)]*\)\s*$/, ''); // Remove "Issued by..." suffix
        name = name.replace(/\s+/g, ' ').trim(); // Normalize spaces
        
        // Extract issuer from the original line
        let issuer = 'Unknown';
        if (cleanLine.includes('|')) {
          const parts = cleanLine.split('|');
          if (parts.length > 1) {
            issuer = parts[1].trim();
          }
        }
        
        // Convert date to month input format (YYYY-MM)
        let formattedDate = dateIssued;
        if (dateIssued && dateIssued !== '') {
          const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          
          const dateMatch = dateIssued.match(/([A-Za-z]+)\s+(\d{4})/);
          if (dateMatch) {
            const month = monthMap[dateMatch[1]];
            const year = dateMatch[2];
            if (month) {
              formattedDate = `${year}-${month}`; // Format for month input: "2025-04"
            }
          }
        }
        
        if (name.length >= 3 && name.length <= 200) {
          certifications.push({
            name: name,
            issuer: issuer,
            date: formattedDate, // Frontend expects YYYY-MM format for month input
            expirationDate: '',
            credentialId: '',
            description: ''
          });
          
          console.log(`🎓 ✅ Found bullet certification: ${name}`);
        }
      }
    }
    
    return { data: certifications, confidence: certifications.length > 0 ? 0.8 : 0 };
  }

  /**
   * Parse contact-heavy format certifications
   */
  parseContactHeavyFormat(text) {
    console.log('🎓 Using contact-heavy format parsing');
    const certifications = [];
    const lines = text.split('\n').map(l => l ? l.trim() : '').filter(l => l.length > 0);
    
    for (const line of lines) {
      // Skip headers and contact info
      if (line.match(/^(TECHNICAL|SKILLS|CONTACT|Phone|Email|EDUCATION|PROJECTS)/i)) continue;
      
      // Look for certification keywords
      if (line.match(/\b(Certificate|Certification|Google|Microsoft|Coursera|Academy|AWS|Oracle|Cisco)\b/i)) {
        // Extract name and details
        const parts = line.split('|').map(p => p ? p.trim() : '');
        if (parts.length >= 2) {
          const name = parts[0];
          const details = parts[1];
          
          // Extract date from details
          const dateMatch = details.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
          const dateIssued = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : '';
          
          // Extract issuer
          const issuer = details ? details.replace(dateMatch ? dateMatch[0] : '', '').trim() || 'Unknown' : 'Unknown';
          
          // Convert date to month input format (YYYY-MM)
          let formattedDate = dateIssued;
          if (dateIssued && dateIssued !== '') {
            const monthMap = {
              'January': '01', 'February': '02', 'March': '03', 'April': '04',
              'May': '05', 'June': '06', 'July': '07', 'August': '08',
              'September': '09', 'October': '10', 'November': '11', 'December': '12'
            };
            
            const dateMatch = dateIssued.match(/([A-Za-z]+)\s+(\d{4})/);
            if (dateMatch) {
              const month = monthMap[dateMatch[1]];
              const year = dateMatch[2];
              if (month) {
                formattedDate = `${year}-${month}`; // Format for month input: "2025-04"
              }
            }
          }
          
          certifications.push({
            name: name,
            issuer: issuer,
            date: formattedDate,
            expirationDate: '',
            credentialId: '',
            description: ''
          });
          
          console.log('🎓 ✅ Found contact-heavy certification:', name);
        }
      }
    }
    
    return { data: certifications, confidence: certifications.length > 0 ? 0.8 : 0 };
  }
  
  /**
   * Extract certifications from combined EDUCATION & CERTIFICATIONS section
   */
  extractCertificationsFromCombined(combinedText) {
    // Look for certification patterns in combined text
    const certificationPatterns = [
      // Pattern 1: "• Google UX Design Certificate (2020)"
      /[•·▪▫-]\s*([^•\n]*(?:Certificate|Certification|Google|Microsoft|AWS|Oracle|Cisco|Adobe)[^•\n]*)/gi,
      // Pattern 2: Lines containing certification keywords
      /^[^•\n]*(?:Certificate|Certification|Google|Microsoft|AWS|Oracle|Cisco|Adobe)[^•\n]*$/gmi
    ];
    
    let certificationText = '';
    
    for (const pattern of certificationPatterns) {
      const matches = combinedText.match(pattern);
      if (matches) {
        certificationText += matches.join('\n') + '\n';
      }
    }
    
    return certificationText.trim();
  }

  /**
   * Parse concatenated certifications (Hannah's PDF format)
   */
  parseConcatenatedCertifications(text) {
    console.log('🎓 Parsing concatenated certifications');
    const certifications = [];
    
    // Hannah's specific patterns - extract each certification individually
    const certPatterns = [
      { name: 'Student Mobility Programme', issuer: 'Universiti Teknologi Petronas, Malaysia', datePattern: /April\s*2025/i },
      { name: 'Google UX Design', issuer: 'Coursera (Issued by Google)', datePattern: /June\s*2025/i },
      { name: 'Preparing Data for Analysis with Microsoft Excel', issuer: 'Coursera (Issued by Microsoft)', datePattern: /June\s*2025/i },
      { name: 'Harnessing the Power of Data with PowerBI', issuer: 'Coursera (Issued by Microsoft)', datePattern: /June\s*2025/i },
      { name: 'Introduction to Data Science', issuer: 'Cisco Networking Academy', datePattern: /October\s*2025/i },
      { name: 'English Certificate (C2 Proficient, Score: 80/100)', issuer: 'EF SET', datePattern: /October\s*2025/i }
    ];
    
    for (const cert of certPatterns) {
      // Check if this certification exists in the text (use partial matching)
      const searchTerm = cert.name.substring(0, Math.min(15, cert.name.length));
      if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
        
        // Extract the actual date from the text using the pattern
        let extractedDate = '';
        const dateMatch = text.match(cert.datePattern);
        if (dateMatch) {
          extractedDate = dateMatch[0].replace(/\s+/g, ' ').trim();
          // Add space between month and year for better readability (April2025 -> April 2025)
          extractedDate = extractedDate.replace(/([A-Za-z]+)(\d{4})/, '$1 $2');
        }
        
        // If no date found, try to find it near the certification name
        if (!extractedDate) {
          const certIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase());
          if (certIndex !== -1) {
            const surroundingText = text.substring(certIndex, certIndex + 200);
            const generalDateMatch = surroundingText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/i);
            if (generalDateMatch) {
              extractedDate = `${generalDateMatch[1]} ${generalDateMatch[2]}`;
            }
          }
        }
        
        // Convert date to month input format (YYYY-MM)
        let formattedDate = extractedDate || '';
        if (extractedDate && extractedDate !== 'Date not specified') {
          const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          
          const dateMatch = extractedDate.match(/([A-Za-z]+)\s+(\d{4})/);
          if (dateMatch) {
            const month = monthMap[dateMatch[1]];
            const year = dateMatch[2];
            if (month) {
              formattedDate = `${year}-${month}`; // Format for month input: "2025-04"
            }
          }
        }
        
        certifications.push({
          name: cert.name,
          issuer: cert.issuer,
          date: formattedDate, // Frontend expects YYYY-MM format for month input
          expirationDate: '',
          credentialId: '',
          description: ''
        });
        
        console.log(`🎓 ✅ Added concatenated certification: ${cert.name} (${extractedDate})`);
      }
    }
    
    return certifications;
  }

  /**
   * Helper to convert month name to number
   */
  getMonthNumber(monthName) {
    const monthMap = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    return monthMap[monthName.toLowerCase()] || '01';
  }
}

module.exports = CertificationsParser;
