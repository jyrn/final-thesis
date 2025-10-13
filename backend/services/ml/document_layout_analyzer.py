"""
Document Layout Analysis (DLA) Service
Handles multi-column detection, reading order, and layout-aware text extraction
"""

import cv2
import numpy as np
from pdf2image import convert_from_path
from PIL import Image
from typing import List, Dict, Tuple, Optional
import logging
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LayoutElementType(Enum):
    """Types of layout elements"""
    TEXT = "text"
    TITLE = "title"
    HEADER = "header"
    FOOTER = "footer"
    TABLE = "table"
    IMAGE = "image"
    LIST = "list"
    COLUMN = "column"


@dataclass
class LayoutElement:
    """Represents a layout element with position and content"""
    type: LayoutElementType
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    text: str = ""
    confidence: float = 1.0
    reading_order: int = 0
    column_index: int = 0


class DocumentLayoutAnalyzer:
    """
    Advanced document layout analysis for resume parsing
    Handles multi-column detection, reading order, and structure extraction
    """
    
    def __init__(
        self,
        dpi: int = 300,
        min_column_width: int = 200,
        column_gap_threshold: int = 50
    ):
        """
        Initialize layout analyzer
        
        Args:
            dpi: DPI for PDF to image conversion
            min_column_width: Minimum width for column detection (pixels)
            column_gap_threshold: Minimum gap between columns (pixels)
        """
        self.dpi = dpi
        self.min_column_width = min_column_width
        self.column_gap_threshold = column_gap_threshold
        
        logger.info("Document Layout Analyzer initialized")
    
    def analyze_pdf(self, pdf_path: str) -> Dict:
        """
        Analyze PDF layout and extract structured content
        
        Args:
            pdf_path: Path to PDF file
        
        Returns:
            Dictionary with layout analysis results
        """
        logger.info(f"Analyzing PDF layout: {pdf_path}")
        
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=self.dpi)
        
        all_elements = []
        all_text = []
        
        for page_num, image in enumerate(images):
            logger.info(f"Processing page {page_num + 1}/{len(images)}")
            
            # Convert PIL image to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Detect layout elements
            elements = self.detect_layout_elements(cv_image)
            
            # Detect columns
            columns = self.detect_columns(cv_image, elements)
            
            # Assign elements to columns
            elements = self.assign_to_columns(elements, columns)
            
            # Establish reading order
            elements = self.establish_reading_order(elements, columns)
            
            # Extract text in reading order
            page_text = self.extract_ordered_text(elements)
            
            all_elements.extend(elements)
            all_text.append(page_text)
        
        return {
            'num_pages': len(images),
            'elements': all_elements,
            'text': '\n\n'.join(all_text),
            'layout_type': self.classify_layout(all_elements),
            'has_multi_column': len(columns) > 1 if columns else False
        }
    
    def detect_layout_elements(self, image: np.ndarray) -> List[LayoutElement]:
        """
        Detect layout elements using computer vision
        
        Args:
            image: OpenCV image
        
        Returns:
            List of detected layout elements
        """
        elements = []
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11, 2
        )
        
        # Detect text regions using morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 3))
        dilated = cv2.dilate(binary, kernel, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(
            dilated,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        height, width = image.shape[:2]
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter small regions
            if w < 50 or h < 10:
                continue
            
            # Classify element type based on position and size
            element_type = self._classify_element(x, y, w, h, width, height)
            
            elements.append(LayoutElement(
                type=element_type,
                bbox=(x, y, x + w, y + h),
                confidence=0.9
            ))
        
        return elements
    
    def _classify_element(
        self,
        x: int, y: int, w: int, h: int,
        page_width: int, page_height: int
    ) -> LayoutElementType:
        """Classify layout element based on position and size"""
        
        # Header detection (top 10% of page)
        if y < page_height * 0.1:
            return LayoutElementType.HEADER
        
        # Footer detection (bottom 10% of page)
        if y > page_height * 0.9:
            return LayoutElementType.FOOTER
        
        # Title detection (large height, centered)
        if h > 30 and abs((x + w/2) - page_width/2) < page_width * 0.2:
            return LayoutElementType.TITLE
        
        # Table detection (grid-like structure)
        aspect_ratio = w / h if h > 0 else 0
        if aspect_ratio > 3 and h < 50:
            return LayoutElementType.TABLE
        
        # Default to text
        return LayoutElementType.TEXT
    
    def detect_columns(
        self,
        image: np.ndarray,
        elements: List[LayoutElement]
    ) -> List[Tuple[int, int]]:
        """
        Detect column boundaries using projection profile
        
        Args:
            image: OpenCV image
            elements: Detected layout elements
        
        Returns:
            List of column boundaries [(x_start, x_end), ...]
        """
        height, width = image.shape[:2]
        
        # Create horizontal projection profile
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Sum pixels vertically
        projection = np.sum(binary, axis=0)
        
        # Smooth projection
        kernel_size = 20
        kernel = np.ones(kernel_size) / kernel_size
        projection_smooth = np.convolve(projection, kernel, mode='same')
        
        # Find valleys (column gaps)
        threshold = np.mean(projection_smooth) * 0.3
        gaps = []
        in_gap = False
        gap_start = 0
        
        for x, value in enumerate(projection_smooth):
            if value < threshold and not in_gap:
                gap_start = x
                in_gap = True
            elif value >= threshold and in_gap:
                gap_width = x - gap_start
                if gap_width > self.column_gap_threshold:
                    gaps.append((gap_start, x))
                in_gap = False
        
        # Convert gaps to columns
        if not gaps:
            # Single column
            return [(0, width)]
        
        columns = []
        prev_end = 0
        
        for gap_start, gap_end in gaps:
            if gap_start - prev_end > self.min_column_width:
                columns.append((prev_end, gap_start))
            prev_end = gap_end
        
        # Add last column
        if width - prev_end > self.min_column_width:
            columns.append((prev_end, width))
        
        logger.info(f"Detected {len(columns)} columns: {columns}")
        
        return columns
    
    def assign_to_columns(
        self,
        elements: List[LayoutElement],
        columns: List[Tuple[int, int]]
    ) -> List[LayoutElement]:
        """
        Assign each element to a column
        
        Args:
            elements: Layout elements
            columns: Column boundaries
        
        Returns:
            Elements with column_index assigned
        """
        for element in elements:
            x1, _, x2, _ = element.bbox
            element_center = (x1 + x2) / 2
            
            # Find which column contains the element center
            for col_idx, (col_start, col_end) in enumerate(columns):
                if col_start <= element_center <= col_end:
                    element.column_index = col_idx
                    break
        
        return elements
    
    def establish_reading_order(
        self,
        elements: List[LayoutElement],
        columns: List[Tuple[int, int]]
    ) -> List[LayoutElement]:
        """
        Establish reading order using XY-cut algorithm
        
        Args:
            elements: Layout elements with column assignments
            columns: Column boundaries
        
        Returns:
            Elements with reading_order assigned
        """
        # Sort by column first, then by vertical position
        sorted_elements = sorted(
            elements,
            key=lambda e: (e.column_index, e.bbox[1])  # column, then y-position
        )
        
        # Assign reading order
        for idx, element in enumerate(sorted_elements):
            element.reading_order = idx
        
        return sorted_elements
    
    def extract_ordered_text(self, elements: List[LayoutElement]) -> str:
        """
        Extract text in reading order
        
        Args:
            elements: Layout elements with reading order
        
        Returns:
            Ordered text string
        """
        # Sort by reading order
        sorted_elements = sorted(elements, key=lambda e: e.reading_order)
        
        # Extract text (placeholder - actual OCR would be done here)
        text_parts = []
        current_column = -1
        
        for element in sorted_elements:
            # Skip headers and footers
            if element.type in [LayoutElementType.HEADER, LayoutElementType.FOOTER]:
                continue
            
            # Add column break marker
            if element.column_index != current_column:
                if current_column != -1:
                    text_parts.append('\n\n[COLUMN_BREAK]\n\n')
                current_column = element.column_index
            
            # Add element text (would be extracted via OCR)
            if element.text:
                text_parts.append(element.text)
        
        return '\n'.join(text_parts)
    
    def classify_layout(self, elements: List[LayoutElement]) -> str:
        """
        Classify overall document layout
        
        Args:
            elements: Layout elements
        
        Returns:
            Layout type string
        """
        if not elements:
            return 'unknown'
        
        # Count columns
        num_columns = len(set(e.column_index for e in elements))
        
        # Count element types
        type_counts = {}
        for element in elements:
            type_counts[element.type] = type_counts.get(element.type, 0) + 1
        
        # Classify
        if num_columns > 1:
            return 'multi-column'
        elif type_counts.get(LayoutElementType.TABLE, 0) > 3:
            return 'table-heavy'
        elif type_counts.get(LayoutElementType.IMAGE, 0) > 2:
            return 'infographic'
        else:
            return 'standard'
    
    def preprocess_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy
        
        Args:
            image: Input image
        
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Deskew
        gray = self._deskew(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Binarize
        binary = cv2.adaptiveThreshold(
            enhanced, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        # Upscale if resolution is low
        if binary.shape[0] < 2000:
            scale_factor = 2000 / binary.shape[0]
            binary = cv2.resize(
                binary,
                None,
                fx=scale_factor,
                fy=scale_factor,
                interpolation=cv2.INTER_CUBIC
            )
        
        return binary
    
    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """Deskew image using Hough transform"""
        # Detect edges
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        
        # Detect lines
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
        
        if lines is None:
            return image
        
        # Calculate average angle
        angles = []
        for rho, theta in lines[:, 0]:
            angle = np.degrees(theta) - 90
            if -45 < angle < 45:
                angles.append(angle)
        
        if not angles:
            return image
        
        median_angle = np.median(angles)
        
        # Rotate image
        if abs(median_angle) > 0.5:
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        
        return image


# Flask API wrapper
if __name__ == '__main__':
    from flask import Flask, request, jsonify
    import tempfile
    import os
    
    app = Flask(__name__)
    analyzer = DocumentLayoutAnalyzer()
    
    @app.route('/analyze-layout', methods=['POST'])
    def analyze_layout():
        """API endpoint for layout analysis"""
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
            
            # Analyze layout
            result = analyzer.analyze_pdf(tmp_path)
            
            # Clean up
            os.unlink(tmp_path)
            
            # Convert elements to JSON-serializable format
            result['elements'] = [
                {
                    'type': e.type.value,
                    'bbox': e.bbox,
                    'text': e.text,
                    'confidence': e.confidence,
                    'reading_order': e.reading_order,
                    'column_index': e.column_index
                }
                for e in result['elements']
            ]
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error analyzing layout: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'service': 'Document Layout Analyzer'})
    
    app.run(host='0.0.0.0', port=5002, debug=False)
