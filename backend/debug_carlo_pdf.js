/**
 * Debug script to extract text from Carlo's actual PDF resume
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find the most recent PDF in uploads/resumes
const uploadsDir = path.join(__dirname, 'uploads', 'resumes');

if (!fs.existsSync(uploadsDir)) {
  console.log('❌ Uploads directory not found');
  process.exit(1);
}

const files = fs.readdirSync(uploadsDir)
  .filter(f => f.endsWith('.pdf'))
  .map(f => ({
    name: f,
    path: path.join(uploadsDir, f),
    time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.log('❌ No PDF files found in uploads/resumes');
  process.exit(1);
}

const latestPdf = files[0];
console.log(`📄 Extracting text from: ${latestPdf.name}`);
console.log(`📄 File path: ${latestPdf.path}`);
console.log('');

// Use Python to extract text
const pythonScript = path.join(__dirname, 'services', 'pdf_parser.py');

const python = spawn('python', [pythonScript, latestPdf.path]);

let output = '';
let errorOutput = '';

python.stdout.on('data', (data) => {
  output += data.toString();
});

python.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

python.on('close', (code) => {
  if (code !== 0) {
    console.log('❌ PDF extraction failed');
    console.log('Error:', errorOutput);
    process.exit(1);
  }

  console.log('✅ PDF Text Extraction Complete\n');
  console.log('='.repeat(80));
  console.log('EXTRACTED TEXT:');
  console.log('='.repeat(80));
  console.log(output);
  console.log('='.repeat(80));
  console.log(`\nTotal characters: ${output.length}`);
  console.log(`Total lines: ${output.split('\n').length}`);
  
  // Show first 1000 characters
  console.log('\n' + '='.repeat(80));
  console.log('FIRST 1000 CHARACTERS:');
  console.log('='.repeat(80));
  console.log(output.substring(0, 1000));
  
  // Try to identify projects section
  console.log('\n' + '='.repeat(80));
  console.log('PROJECTS SECTION ANALYSIS:');
  console.log('='.repeat(80));
  
  const projectsMatch = output.match(/PROJECTS[\s\S]*?(?=TECHNICAL|EDUCATION|CERTIFICATIONS|$)/i);
  if (projectsMatch) {
    console.log('✅ Projects section found:');
    console.log(projectsMatch[0]);
  } else {
    console.log('❌ Projects section not found');
  }
});
