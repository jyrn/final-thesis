"""
Enhanced OCR Service with Preprocessing and Multi-Engine Support
Handles complex layouts, low-quality scans, and multi-column documents
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """OCR result with confidence scores"""
    text: str
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]] = None
    word_confidences: Optional[List[float]] = None


class EnhancedOCRService:
    """
    Advanced OCR service with preprocessing and quality enhancement
    """
    
    def __init__(
        self,
        tesseract_path: Optional[str] = None,
        confidence_threshold: float = 60.0,
        use_preprocessing: bool = True
    ):
        """
        Initialize OCR service
        
        Args:
            tesseract_path: Path to Tesseract executable
            confidence_threshold: Minimum confidence for accepting OCR results
            use_preprocessing: Whether to apply image preprocessing
        """
        import os
        
        # Use provided path, or check environment variable, or use default
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        elif os.environ.get('TESSERACT_PATH'):
            pytesseract.pytesseract.tesseract_cmd = os.environ.get('TESSERACT_PATH')
        
        self.confidence_threshold = confidence_threshold
        self.use_preprocessing = use_preprocessing
        
        # Verify Tesseract installation
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {version}")
        except Exception as e:
            logger.error(f"Tesseract not found: {e}")
            raise
        
        logger.info("Enhanced OCR Service initialized")
    
    def extract_text_from_pdf(
        self,
        pdf_path: str,
        dpi: int = 300
    ) -> Dict:
        """
        Extract text from PDF with OCR
        
        Args:
            pdf_path: Path to PDF file
            dpi: DPI for image conversion
        
        Returns:
            Dictionary with extracted text and metadata
        """
        logger.info(f"Extracting text from PDF: {pdf_path}")
        
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=dpi)
        
        all_text = []
        all_confidences = []
        page_results = []
        
        for page_num, image in enumerate(images):
            logger.info(f"Processing page {page_num + 1}/{len(images)}")
            
            # Convert PIL to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Preprocess image
            if self.use_preprocessing:
                cv_image = self.preprocess_image(cv_image)
            
            # Perform OCR
            result = self.ocr_image(cv_image)
            
            all_text.append(result.text)
            all_confidences.append(result.confidence)
            
            page_results.append({
                'page': page_num + 1,
                'text': result.text,
                'confidence': result.confidence,
                'word_count': len(result.text.split())
            })
        
        # Combine all pages
        full_text = '\n\n'.join(all_text)
        avg_confidence = np.mean(all_confidences) if all_confidences else 0
        
        return {
            'text': full_text,
            'confidence': avg_confidence,
            'num_pages': len(images),
            'pages': page_results,
            'method': 'ocr',
            'quality': self.assess_quality(avg_confidence)
        }
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy
        
        Args:
            image: Input image
        
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Deskew
        gray = self.deskew(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        
        # Enhance contrast using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            enhanced,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )
        
        # Remove noise with morphological operations
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # Upscale if resolution is low
        height, width = cleaned.shape
        if height < 2000:
            scale_factor = 2000 / height
            cleaned = cv2.resize(
                cleaned,
                None,
                fx=scale_factor,
                fy=scale_factor,
                interpolation=cv2.INTER_CUBIC
            )
        
        return cleaned
    
    def deskew(self, image: np.ndarray) -> np.ndarray:
        """
        Deskew image using Hough line detection
        
        Args:
            image: Input image
        
        Returns:
            Deskewed image
        """
        # Detect edges
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        
        # Detect lines
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
        
        if lines is None or len(lines) == 0:
            return image
        
        # Calculate angles
        angles = []
        for rho, theta in lines[:, 0]:
            angle = np.degrees(theta) - 90
            if -45 < angle < 45:
                angles.append(angle)
        
        if not angles:
            return image
        
        # Get median angle
        median_angle = np.median(angles)
        
        # Rotate if angle is significant
        if abs(median_angle) > 0.5:
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(
                image,
                M,
                (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        
        return image
    
    def ocr_image(self, image: np.ndarray) -> OCRResult:
        """
        Perform OCR on image with confidence scoring
        
        Args:
            image: Input image
        
        Returns:
            OCR result with confidence
        """
        # Get detailed OCR data
        data = pytesseract.image_to_data(
            image,
            output_type=pytesseract.Output.DICT,
            config='--psm 3'  # Fully automatic page segmentation
        )
        
        # Extract text and confidences
        text_parts = []
        confidences = []
        
        for i, conf in enumerate(data['conf']):
            if conf > 0:  # Valid confidence
                text = data['text'][i].strip()
                if text:
                    text_parts.append(text)
                    confidences.append(float(conf))
        
        # Combine text
        full_text = ' '.join(text_parts)
        
        # Calculate average confidence
        avg_confidence = np.mean(confidences) if confidences else 0
        
        # Post-process text
        full_text = self.post_process_text(full_text)
        
        return OCRResult(
            text=full_text,
            confidence=avg_confidence,
            word_confidences=confidences
        )
    
    def post_process_text(self, text: str) -> str:
        """
        Post-process OCR text to fix common errors
        
        Args:
            text: Raw OCR text
        
        Returns:
            Cleaned text
        """
        # Fix common OCR errors
        corrections = {
            r'\bl\b': 'I',  # lowercase L to uppercase I
            r'\b0\b(?=[A-Z])': 'O',  # zero to O before uppercase
            r'(?<=[A-Z])\b0\b': 'O',  # zero to O after uppercase
            r'\|': 'I',  # pipe to I
            r'¢': 'c',
            r'©': 'c',
            r'®': 'r',
        }
        
        for pattern, replacement in corrections.items():
            text = re.sub(pattern, replacement, text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix line breaks
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        
        return text.strip()
    
    def assess_quality(self, confidence: float) -> str:
        """
        Assess OCR quality based on confidence
        
        Args:
            confidence: Average confidence score
        
        Returns:
            Quality assessment string
        """
        if confidence >= 90:
            return 'excellent'
        elif confidence >= 80:
            return 'good'
        elif confidence >= 70:
            return 'fair'
        elif confidence >= 60:
            return 'poor'
        else:
            return 'very_poor'
    
    def extract_with_layout(
        self,
        image: np.ndarray
    ) -> Dict:
        """
        Extract text preserving layout structure
        
        Args:
            image: Input image
        
        Returns:
            Dictionary with structured text
        """
        # Get layout-aware OCR data
        data = pytesseract.image_to_data(
            image,
            output_type=pytesseract.Output.DICT,
            config='--psm 3'
        )
        
        # Group by blocks and paragraphs
        blocks = {}
        
        for i in range(len(data['text'])):
            if data['conf'][i] > 0:
                block_num = data['block_num'][i]
                par_num = data['par_num'][i]
                line_num = data['line_num'][i]
                
                key = (block_num, par_num, line_num)
                
                if key not in blocks:
                    blocks[key] = []
                
                blocks[key].append({
                    'text': data['text'][i],
                    'conf': data['conf'][i],
                    'bbox': (
                        data['left'][i],
                        data['top'][i],
                        data['width'][i],
                        data['height'][i]
                    )
                })
        
        # Reconstruct text with layout
        structured_text = []
        
        for key in sorted(blocks.keys()):
            line_text = ' '.join([word['text'] for word in blocks[key]])
            structured_text.append(line_text)
        
        return {
            'text': '\n'.join(structured_text),
            'blocks': blocks,
            'num_blocks': len(set(k[0] for k in blocks.keys()))
        }
    
    def compare_engines(
        self,
        image: np.ndarray
    ) -> Dict:
        """
        Compare results from different OCR configurations
        
        Args:
            image: Input image
        
        Returns:
            Dictionary with comparison results
        """
        configs = [
            ('--psm 3', 'Fully automatic'),
            ('--psm 4', 'Single column'),
            ('--psm 6', 'Uniform block'),
        ]
        
        results = []
        
        for config, description in configs:
            try:
                text = pytesseract.image_to_string(image, config=config)
                data = pytesseract.image_to_data(
                    image,
                    output_type=pytesseract.Output.DICT,
                    config=config
                )
                
                confidences = [c for c in data['conf'] if c > 0]
                avg_conf = np.mean(confidences) if confidences else 0
                
                results.append({
                    'config': config,
                    'description': description,
                    'text': text,
                    'confidence': avg_conf,
                    'word_count': len(text.split())
                })
            except Exception as e:
                logger.error(f"Error with config {config}: {e}")
        
        # Select best result
        best = max(results, key=lambda x: x['confidence'])
        
        return {
            'best': best,
            'all_results': results
        }


# Flask API wrapper
if __name__ == '__main__':
    from flask import Flask, request, jsonify
    import tempfile
    import os
    
    app = Flask(__name__)
    ocr_service = EnhancedOCRService()
    
    @app.route('/ocr-pdf', methods=['POST'])
    def ocr_pdf():
        """API endpoint for PDF OCR"""
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files supported'}), 400
        
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            
            # Extract text
            result = ocr_service.extract_text_from_pdf(tmp_path)
            
            # Clean up
            os.unlink(tmp_path)
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'service': 'Enhanced OCR'})
    
    app.run(host='0.0.0.0', port=5003, debug=False)
