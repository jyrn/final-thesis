#!/usr/bin/env python3
"""
PDF Text Extraction Script using PyPDF2 and Tesseract OCR
This script extracts text from PDF files, first trying PyPDF2 for text-based PDFs,
then falling back to Tesseract OCR for image-based PDFs.
"""

import sys
import os
import tempfile
import subprocess
import json
import re
from io import BytesIO

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    print("Warning: PyPDF2 not available, using OCR only", file=sys.stderr)

try:
    from PIL import Image
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: Tesseract/PIL not available, using PyPDF2 only", file=sys.stderr)

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("Warning: PyMuPDF not available, OCR functionality limited", file=sys.stderr)

def check_ocr_setup():
    """Check if OCR dependencies are properly installed"""
    issues = []
    
    if not TESSERACT_AVAILABLE:
        issues.append("Tesseract OCR not available. Install with: pip install pytesseract")
    
    if not PYMUPDF_AVAILABLE:
        issues.append("PyMuPDF not available. Install with: pip install PyMuPDF")
    
    if TESSERACT_AVAILABLE:
        try:
            # Try to get Tesseract version to check if it's properly installed
            import pytesseract
            version = pytesseract.get_tesseract_version()
            print(f"Tesseract version: {version}", file=sys.stderr)
        except Exception as e:
            issues.append(f"Tesseract binary not found. Please install Tesseract OCR: {e}")
    
    if issues:
        print("OCR Setup Issues:", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        print("  - For Windows: Download Tesseract from https://github.com/UB-Mannheim/tesseract/wiki", file=sys.stderr)
        print("  - For Mac: brew install tesseract", file=sys.stderr)
        print("  - For Linux: sudo apt-get install tesseract-ocr", file=sys.stderr)
    
    return len(issues) == 0


def extract_text_pypdf2(pdf_path):
    """Extract text using PyPDF2 with encoding safety"""
    if not PYPDF2_AVAILABLE:
        return ""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                try:
                    page_text = page.extract_text()
                    # Clean the text immediately after extraction
                    if page_text:
                        # Replace problematic characters with safe alternatives
                        page_text = page_text.replace('\u2022', '•')  # Bullet points
                        page_text = page_text.replace('\u2013', '-')  # En dash
                        page_text = page_text.replace('\u2014', '-')  # Em dash
                        page_text = page_text.replace('\u2019', "'")  # Right single quotation
                        page_text = page_text.replace('\u201c', '"')  # Left double quotation
                        page_text = page_text.replace('\u201d', '"')  # Right double quotation
                        
                        # FIX SPACING ISSUES: Add proper line breaks and spaces
                        import re
                        
                        # CRITICAL FIX: Add spaces between ALL CamelCase words FIRST
                        # But preserve common abbreviations and acronyms
                        page_text = re.sub(r'([a-z])([A-Z])(?![A-Z])', r'\1 \2', page_text)
                        
                        # Fix specific concatenated words that are common in resumes
                        concatenated_fixes = {
                            'Systemfor': 'System for',
                            'Appforthe': 'App for the', 
                            'Elderlyand': 'Elderly and',
                            'Computationand': 'Computation and',
                            'Datafor': 'Data for',
                            'Analysiswith': 'Analysis with',
                            'Powerof': 'Power of',
                            'Datawith': 'Data with',
                            'Networkingand': 'Networking and',
                            'Certificationsand': 'Certifications and',
                            'Seminarswith': 'Seminars with',
                            'Programmewith': 'Programme with',
                            'Designwith': 'Design with',
                            'Academyand': 'Academy and',
                            'Bachelorof': 'Bachelor of',
                            'Sciencein': 'Science in',
                            'DeLaSalle': 'De La Salle',
                            'SanPablo': 'San Pablo',
                            'WebDevelopment': 'Web Development',
                            'MobileDevelopment': 'Mobile Development',
                            'SoftwareDevelopment': 'Software Development',
                            'DataAnalysis': 'Data Analysis',
                            'MachineLearning': 'Machine Learning',
                            'ProjectManagement': 'Project Management',
                            'ProblemSolving': 'Problem Solving',
                            'CriticalThinking': 'Critical Thinking',
                            'TimeManagement': 'Time Management',
                            'UserExperience': 'User Experience',
                            'UserInterface': 'User Interface'
                        }
                        
                        for concatenated, fixed in concatenated_fixes.items():
                            page_text = page_text.replace(concatenated, fixed)
                        
                        # SIMPLE APPROACH: Add line breaks before section headers
                        # This works for any resume format
                        
                        # Before major section headers
                        page_text = re.sub(r'(\s+)(Education)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Experience)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Skills)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Projects?)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Certifications?)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Awards?)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Objective)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Summary)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(References?)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Languages?)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(\s+)(Volunteer)(\s+)', r'\n\n\2\n', page_text, flags=re.IGNORECASE)
                        
                        # Add line break after name (before job title in ALL CAPS)
                        page_text = re.sub(r'([a-z])\s+(DESIGNER|DEVELOPER|ENGINEER|MANAGER|ANALYST)', r'\1\n\2', page_text)
                        
                        # Add line break after job title (before location)
                        page_text = re.sub(r'(DESIGNER|DEVELOPER|ENGINEER|MANAGER|ANALYST)\s+([A-Z][a-z]+)', r'\1\n\2', page_text)
                        
                        # Add line breaks before pipe separators (contact info)
                        page_text = re.sub(r'([a-z0-9])\s*\|', r'\1\n|', page_text)
                        
                        # Add line breaks after dates
                        page_text = re.sub(r'(\d{4}-(?:\d{4}|Present|Current))\s+([A-Z])', r'\1\n\2', page_text)
                        
                        # Fix concatenated location/contact info
                        page_text = re.sub(r'(City|Province|State),([A-Z])', r'\1, \2', page_text)
                        
                        # Fix concatenated name patterns
                        page_text = re.sub(r'([a-z])([A-Z]\.)([A-Z][a-z]+)', r'\1 \2 \3', page_text)  # L.Comia -> L. Comia
                        
                        # Fix concatenated job titles
                        page_text = re.sub(r'([a-z])(UI/UX|UX/UI)', r'\1\n\2', page_text)
                        page_text = re.sub(r'(UI/UX|UX/UI)(DESIGNER|DEVELOPER)', r'\1 \2', page_text)
                        
                        # CRITICAL: Add line breaks before major sections
                        page_text = re.sub(r'(Education|Experience|Skills|Projects|Certifications|Awards|Objective|Summary)', r'\n\n\1', page_text, flags=re.IGNORECASE)
                        page_text = re.sub(r'(DESIGNER|DEVELOPER|ENGINEER)\s+([A-Z])', r'\1\n\n\2', page_text)
                        
                        # Add line breaks before contact info
                        page_text = re.sub(r'([a-z])\|', r'\1\n|', page_text)  # Pipe separator
                        page_text = re.sub(r'\|(\d)', r'| \1', page_text)  # After pipe before number
                        page_text = re.sub(r'([a-z])(@)', r'\1\n\2', page_text)  # Email on new line
                        page_text = re.sub(r'([a-z])(LinkedIn|GitHub)', r'\1\n\2', page_text)
                        
                        # Add line breaks after dates
                        page_text = re.sub(r'(\d{4})\s+(Present|Current)', r'\1-\1', page_text)  # Fix date format
                        page_text = re.sub(r'(\d{4}-(?:\d{4}|Present|Current))\s+([A-Z])', r'\1\n\2', page_text)
                        
                        # Add line breaks after closing parentheses with details
                        page_text = re.sub(r'(\))\s*([A-Z][a-z]+\s+[A-Z])', r'\1\n\2', page_text)
                        
                        # Add line breaks before project names
                        page_text = re.sub(r'(Projects)\s+([A-Z])', r'\1\n\2', page_text)
                        page_text = re.sub(r'(NLP-Based|Digital\s+Companion|Inventory\s+Management|Grade\s+Computation)', r'\n\1', page_text)
                        
                        # Add line breaks before technology lists (after pipe)
                        page_text = re.sub(r'\|\s*([A-Z][a-z]+)', r'|\1', page_text)
                        
                        # Add line breaks before descriptions
                        page_text = re.sub(r'(Cloud|Figma|CSS|Excel)\s+(Developed|Designed|Built|Automated)', r'\1\n\2', page_text)
                        
                        # Add line breaks before each certificate
                        page_text = re.sub(r'(\d{4})\s+(Student|Google|Preparing|Harnessing|Introduction|English)', r'\1\n\2', page_text)
                        
                        # Add line breaks before skill categories
                        page_text = re.sub(r'(Design\s*&\s*Prototyping|Web\s*Development|Automation\s*&\s*Data|Soft\s*Skills):', r'\n\1:', page_text)
                        
                        # Clean up multiple spaces but preserve line breaks
                        page_text = re.sub(r'[ \t]+', ' ', page_text)  # Only collapse spaces/tabs, not newlines
                        page_text = re.sub(r'\n\s*\n\s*\n', '\n\n', page_text)  # Clean up multiple newlines
                        
                        # Encode and decode to handle any remaining issues
                        page_text = page_text.encode('utf-8', errors='replace').decode('utf-8')
                        text += page_text + "\n"
                except Exception as page_error:
                    print(f"Error extracting page {page_num}: {page_error}", file=sys.stderr)
                    continue
            
            return text.strip()
    except Exception as e:
        print(f"PyPDF2 extraction failed: {e}", file=sys.stderr)
        return ""


def extract_text_ocr(pdf_path):
    """Extract text using OCR (Tesseract) with enhanced image processing"""
    if not TESSERACT_AVAILABLE or not PYMUPDF_AVAILABLE:
        print("OCR dependencies not available", file=sys.stderr)
        return ""
    
    try:
        print(f"Starting OCR extraction for: {pdf_path}", file=sys.stderr)
        # Convert PDF to images using PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        
        for page_num in range(len(doc)):
            print(f"Processing page {page_num + 1}/{len(doc)} with OCR", file=sys.stderr)
            page = doc.load_page(page_num)
            
            # Get pixmap with higher resolution for better OCR
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Convert to PIL Image
            image = Image.open(BytesIO(img_data))
            
            # Enhance image for better OCR results
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Optional: Apply image enhancements
            # from PIL import ImageEnhance
            # enhancer = ImageEnhance.Contrast(image)
            # image = enhancer.enhance(1.5)  # Increase contrast
            
            # Use Tesseract to extract text with custom config
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?\'"()[]{}@#$%^&*-_+=|\/<> \t\n'
            
            try:
                page_text = pytesseract.image_to_string(image, lang='eng', config=custom_config)
                if page_text.strip():
                    # FIX SPACING ISSUES in OCR text (conservative approach)
                    import re
                    # Fix section headers and common concatenations
                    page_text = re.sub(r'([a-z])(Education|Experience|Skills|Projects|Certifications|Awards|Objective|Summary)', r'\1 \2', page_text)
                    # Fix contact info concatenations
                    page_text = re.sub(r'([a-z])(@)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(LinkedIn|GitHub)', r'\1 \2', page_text)
                    # Fix job title concatenations
                    page_text = re.sub(r'([a-z])(UI/UX|UX/UI|DESIGNER|DEVELOPER|ENGINEER)', r'\1 \2', page_text)
                    # Fix school name concatenations
                    page_text = re.sub(r'([a-z])(De La Salle|San Pablo|University|College)', r'\1 \2', page_text)
                    # Fix technology concatenations
                    page_text = re.sub(r'([a-z])(JavaScript|TypeScript|React|Node|MongoDB|Firebase)', r'\1 \2', page_text)
                    # Add space before long numbers only
                    page_text = re.sub(r'([a-zA-Z])(\d{4,})', r'\1 \2', page_text)
                    # Clean up multiple spaces
                    page_text = re.sub(r'\s+', ' ', page_text)
                    
                    text += page_text + "\n"
                    print(f"OCR extracted {len(page_text)} characters from page {page_num + 1}", file=sys.stderr)
                else:
                    print(f"No text extracted from page {page_num + 1}", file=sys.stderr)
            except Exception as ocr_error:
                print(f"OCR failed for page {page_num + 1}: {ocr_error}", file=sys.stderr)
                # Try with simpler config
                try:
                    page_text = pytesseract.image_to_string(image, lang='eng')
                    if page_text.strip():
                        # FIX SPACING ISSUES in OCR fallback text (conservative)
                        import re
                        page_text = re.sub(r'([a-z])(Education|Experience|Skills|Projects|Certifications|Awards|Objective|Summary)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-z])(@)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-z])(LinkedIn|GitHub)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-z])(UI/UX|UX/UI|DESIGNER|DEVELOPER|ENGINEER)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-z])(De La Salle|San Pablo|University|College)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-z])(JavaScript|TypeScript|React|Node|MongoDB|Firebase)', r'\1 \2', page_text)
                        page_text = re.sub(r'([a-zA-Z])(\d{4,})', r'\1 \2', page_text)
                        page_text = re.sub(r'\s+', ' ', page_text)
                        
                        text += page_text + "\n"
                        print(f"OCR (fallback) extracted {len(page_text)} characters from page {page_num + 1}", file=sys.stderr)
                except Exception as fallback_error:
                    print(f"OCR fallback also failed for page {page_num + 1}: {fallback_error}", file=sys.stderr)
        
        doc.close()
        print(f"OCR extraction completed. Total text length: {len(text)}", file=sys.stderr)
        return text.strip()
    except Exception as e:
        print(f"OCR extraction failed: {e}", file=sys.stderr)
        return ""


def extract_text_fallback(pdf_path):
    """Fallback method using system tools"""
    try:
        # Try pdftotext if available
        result = subprocess.run(
            ['pdftotext', pdf_path, '-'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            text = result.stdout.strip()
            # FIX SPACING ISSUES in pdftotext output (conservative)
            import re
            text = re.sub(r'([a-z])(Education|Experience|Skills|Projects|Certifications|Awards|Objective|Summary)', r'\1 \2', text)
            text = re.sub(r'([a-z])(@)', r'\1 \2', text)
            text = re.sub(r'([a-z])(LinkedIn|GitHub)', r'\1 \2', text)
            text = re.sub(r'([a-z])(UI/UX|UX/UI|DESIGNER|DEVELOPER|ENGINEER)', r'\1 \2', text)
            text = re.sub(r'([a-z])(De La Salle|San Pablo|University|College)', r'\1 \2', text)
            text = re.sub(r'([a-z])(JavaScript|TypeScript|React|Node|MongoDB|Firebase)', r'\1 \2', text)
            text = re.sub(r'([a-zA-Z])(\d{4,})', r'\1 \2', text)
            text = re.sub(r'\s+', ' ', text)
            return text
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    try:
        # Try pdfplumber as last resort
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    # FIX SPACING ISSUES in pdfplumber output (conservative)
                    import re
                    page_text = re.sub(r'([a-z])(Education|Experience|Skills|Projects|Certifications|Awards|Objective|Summary)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(@)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(LinkedIn|GitHub)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(UI/UX|UX/UI|DESIGNER|DEVELOPER|ENGINEER)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(De La Salle|San Pablo|University|College)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-z])(JavaScript|TypeScript|React|Node|MongoDB|Firebase)', r'\1 \2', page_text)
                    page_text = re.sub(r'([a-zA-Z])(\d{4,})', r'\1 \2', page_text)
                    page_text = re.sub(r'\s+', ' ', page_text)
                    text += page_text + "\n"
            return text.strip()
    except ImportError:
        pass
    
    return ""


def main():
    if len(sys.argv) != 2:
        print("Usage: python pdf_parser.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(f"Error: File {pdf_path} not found", file=sys.stderr)
        sys.exit(1)
    
    # Check OCR setup
    ocr_ready = check_ocr_setup()
    if not ocr_ready:
        print("OCR not fully configured, will use PyPDF2 only", file=sys.stderr)
    
    extracted_text = ""
    
    # Method 1: Try pdfplumber FIRST (best for preserving layout)
    try:
        import pdfplumber
        print("Trying pdfplumber first...", file=sys.stderr)
        with pdfplumber.open(pdf_path) as pdf:
            pdfplumber_text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pdfplumber_text += page_text + "\n"
            
            if pdfplumber_text and len(pdfplumber_text.strip()) > 100:
                print(f"pdfplumber extracted {len(pdfplumber_text)} characters", file=sys.stderr)
                print(pdfplumber_text)
                return
    except Exception as e:
        print(f"pdfplumber failed: {e}", file=sys.stderr)
    
    # Method 2: Try PyPDF2 as fallback
    pypdf2_text = ""
    if PYPDF2_AVAILABLE:
        pypdf2_text = extract_text_pypdf2(pdf_path)
        print(f"PyPDF2 extracted {len(pypdf2_text)} characters", file=sys.stderr)
        
        # If PyPDF2 extracted substantial text, use it
        if pypdf2_text and len(pypdf2_text.strip()) > 100:
            try:
                # Ensure we can encode/decode the text properly
                cleaned_text = pypdf2_text.encode('utf-8', errors='replace').decode('utf-8')
                print(cleaned_text)
                return
            except (UnicodeEncodeError, UnicodeDecodeError) as e:
                # Handle special characters more aggressively
                import re
                # Remove problematic characters and replace with safe alternatives
                safe_text = re.sub(r'[^\x00-\x7F]+', ' ', pypdf2_text)  # Remove non-ASCII
                safe_text = re.sub(r'\s+', ' ', safe_text)  # Clean up multiple spaces
                print(safe_text.strip())
                return
        elif pypdf2_text and len(pypdf2_text.strip()) > 20:
            print(f"PyPDF2 extracted minimal text ({len(pypdf2_text)} chars), trying OCR as well", file=sys.stderr)
    
    # Method 2: Try OCR (especially for image-based PDFs or when PyPDF2 failed)
    ocr_text = ""
    if TESSERACT_AVAILABLE and PYMUPDF_AVAILABLE:
        ocr_text = extract_text_ocr(pdf_path)
        print(f"OCR extracted {len(ocr_text)} characters", file=sys.stderr)
        
        # If OCR extracted substantial text, use it
        if ocr_text and len(ocr_text.strip()) > 50:
            try:
                # Clean PyPDF2 text for encoding issues
                cleaned_text = pypdf2_text.encode('utf-8', errors='replace').decode('utf-8')
                # Structure the text into JSON
                structured_data = structure_resume_text(cleaned_text)
                print(json.dumps(structured_data, ensure_ascii=False, indent=2))
                return
            except (UnicodeEncodeError, UnicodeDecodeError):
                import re
                # Remove problematic characters from OCR text
                safe_text = re.sub(r'[^\x00-\x7F]+', ' ', ocr_text)
                safe_text = re.sub(r'\s+', ' ', safe_text)
                print(safe_text.strip())
    
    # Method 2.5: Combine PyPDF2 and OCR results if both have some text
    if pypdf2_text and ocr_text:
        # Choose the longer result or combine them
        if len(ocr_text) > len(pypdf2_text) * 1.5:  # OCR is significantly longer
            combined_text = ocr_text
            print(f"Using OCR result (longer): {len(ocr_text)} vs {len(pypdf2_text)} chars", file=sys.stderr)
        elif len(pypdf2_text) > len(ocr_text) * 1.5:  # PyPDF2 is significantly longer
            combined_text = pypdf2_text
            print(f"Using PyPDF2 result (longer): {len(pypdf2_text)} vs {len(ocr_text)} chars", file=sys.stderr)
        else:
            # Combine both results
            combined_text = pypdf2_text + "\n\n" + ocr_text
            print(f"Combining both results: PyPDF2({len(pypdf2_text)}) + OCR({len(ocr_text)})", file=sys.stderr)
        
        try:
            cleaned_text = combined_text.encode('utf-8', errors='replace').decode('utf-8')
            print(cleaned_text)
            return
        except (UnicodeEncodeError, UnicodeDecodeError):
            import re
            safe_text = re.sub(r'[^\x00-\x7F]+', ' ', combined_text)
            safe_text = re.sub(r'\s+', ' ', safe_text)
            print(safe_text.strip())
            return
    
    # Method 3: Fallback methods
    extracted_text = extract_text_fallback(pdf_path)
    if extracted_text:
        try:
            # Clean fallback text for encoding issues
            cleaned_text = extracted_text.encode('utf-8', errors='replace').decode('utf-8')
            print(cleaned_text)
        except (UnicodeEncodeError, UnicodeDecodeError):
            import re
            # Remove problematic characters from fallback text
            safe_text = re.sub(r'[^\x00-\x7F]+', ' ', extracted_text)
            safe_text = re.sub(r'\s+', ' ', safe_text)
            print(safe_text.strip())
        return
    
    # If all methods failed, return error
    print("Error: Could not extract text from PDF", file=sys.stderr)
    sys.exit(1)


def structure_resume_text(text):
    """
    Structure the extracted text into JSON format for easier parsing
    """
    structured = {
        "name": "",
        "contact": {
            "phone": "",
            "email": "",
            "linkedin": "",
            "github": "",
            "location": ""
        },
        "sections": {}
    }
    
    lines = text.split('\n')
    
    # Extract name from first line (usually the name)
    if lines:
        first_line = lines[0].strip()
        # Name pattern: typically at the start, before job title
        name_match = re.match(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)?[A-Z][a-z]+)', first_line)
        if name_match:
            structured["name"] = name_match.group(1).strip()
    
    # Extract contact information
    full_text = ' '.join(lines)
    
    # Email
    email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', full_text)
    if email_match:
        structured["contact"]["email"] = email_match.group(1)
    
    # Phone
    phone_match = re.search(r'(\d{10,11})', full_text)
    if phone_match:
        structured["contact"]["phone"] = phone_match.group(1)
    
    # LinkedIn
    linkedin_match = re.search(r'(?:LinkedIn:|linkedin\.com/)([^\s|]+)', full_text, re.IGNORECASE)
    if linkedin_match:
        structured["contact"]["linkedin"] = linkedin_match.group(1)
    
    # GitHub
    github_match = re.search(r'(?:GitHub:|github\.com/)([^\s|]+)', full_text, re.IGNORECASE)
    if github_match:
        structured["contact"]["github"] = github_match.group(1)
    
    # Location
    location_match = re.search(r'([A-Z][a-z]+\s+(?:City|Province|State),\s*[A-Z][a-z]+)', text)
    if location_match:
        structured["contact"]["location"] = location_match.group(1)
    
    # Detect sections
    current_section = None
    section_content = []
    
    section_headers = {
        'education': r'^\s*Education\s*$',
        'experience': r'^\s*(?:Experience|Work\s+Experience)\s*$',
        'projects': r'^\s*Projects\s*$',
        'skills': r'^\s*(?:Skills|Skills\s+and\s+Abilities)\s*$',
        'certifications': r'^\s*(?:Certifications?|Certifications?\s+and\s+Seminars?)\s*$'
    }
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        # Check if this is a section header
        section_found = False
        for section_name, pattern in section_headers.items():
            if re.match(pattern, line_stripped, re.IGNORECASE):
                # Save previous section
                if current_section and section_content:
                    structured["sections"][current_section] = '\n'.join(section_content)
                
                # Start new section
                current_section = section_name
                section_content = []
                section_found = True
                break
        
        if not section_found and current_section:
            section_content.append(line_stripped)
    
    # Save last section
    if current_section and section_content:
        structured["sections"][current_section] = '\n'.join(section_content)
    
    return structured


if __name__ == "__main__":
    main()
