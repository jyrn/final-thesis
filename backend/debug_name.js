/**
 * Debug Name Extraction for Hannah
 */

const EnhancedPersonalInfoParser = require('./services/parsers/EnhancedPersonalInfoParser');

const hannahText = `Hannah Nicole L. Comia
UI/UX DESIGNER
San Pablo City, Laguna, Philippines | +63 961 072 0526 | hannahnicole.comia16@gmail.com
LinkedIn: www.linkedin.com/in/hannah-nicole-comia | GitHub: github.com/kenyaa

Education
De La Salle Lipa, Bachelor of Science in Computer Science                                    2022 - Present`;

console.log('🔍 Debugging Hannah\'s Name Extraction...\n');

const parser = new EnhancedPersonalInfoParser();
const result = parser.extractNameFromText(hannahText);

console.log('📋 Result:', result);
console.log('🧪 Debug Complete!');
