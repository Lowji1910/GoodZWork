import os
import cv2
import numpy as np
import base64
from typing import List, Tuple, Optional
from datetime import datetime
from ..config import settings

class FaceRecognitionService:
    """
    Simplified Face Recognition Service using OpenCV.
    Works without DeepFace/TensorFlow for better compatibility.
    Uses face histograms for basic face comparison.
    """
    
    def __init__(self):
        self.face_data_path = settings.FACE_DATA_PATH
        self.uploads_path = settings.UPLOADS_PATH
        
        # Ensure directories exist
        os.makedirs(self.face_data_path, exist_ok=True)
        os.makedirs(self.uploads_path, exist_ok=True)
        
        # Load Haar Cascade for face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
    
    def base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to OpenCV image"""
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        img_bytes = base64.b64decode(base64_string)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    
    def detect_face(self, img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect face using OpenCV Haar Cascade"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50)
        )
        
        if len(faces) > 0:
            return tuple(faces[0])  # (x, y, w, h)
        return None
    
    def extract_face_histogram(self, img: np.ndarray, face_rect: Tuple[int, int, int, int]) -> List[float]:
        """
        Extract face histogram as simple encoding.
        Returns normalized histogram as face "embedding".
        """
        x, y, w, h = face_rect
        face_roi = img[y:y+h, x:x+w]
        
        # Resize to standard size
        face_resized = cv2.resize(face_roi, (100, 100))
        
        # Convert to grayscale and compute histogram
        gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        
        # Calculate histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        
        return hist.tolist()
    
    def calculate_laplacian_variance(self, img: np.ndarray) -> float:
        """Calculate Laplacian variance to detect blur"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return laplacian.var()
    
    def is_image_blurry(self, img: np.ndarray, threshold: float = 50.0) -> bool:
        """Check if image is too blurry"""
        return self.calculate_laplacian_variance(img) < threshold
    
    def enroll_faces(self, user_id: str, face_images: List[str]) -> Tuple[bool, str, List[List[float]]]:
        """
        Process face images and extract encodings for enrollment.
        
        Returns:
            (success, message, encodings)
        """
        encodings = []
        user_face_dir = os.path.join(self.face_data_path, str(user_id))
        os.makedirs(user_face_dir, exist_ok=True)
        
        valid_count = 0
        for idx, img_base64 in enumerate(face_images):
            try:
                img = self.base64_to_image(img_base64)
                
                # Skip blurry images
                if self.is_image_blurry(img):
                    continue
                
                # Detect face
                face_rect = self.detect_face(img)
                if face_rect is None:
                    continue
                
                # Extract histogram encoding
                encoding = self.extract_face_histogram(img, face_rect)
                encodings.append(encoding)
                valid_count += 1
                
                # Save some images for reference
                if valid_count <= 10:
                    face_path = os.path.join(user_face_dir, f"face_{valid_count}.jpg")
                    cv2.imwrite(face_path, img)
                    
            except Exception as e:
                print(f"Error processing image {idx}: {e}")
                continue
        
        if valid_count < 10:
            return False, f"Không đủ ảnh khuôn mặt hợp lệ. Chỉ có {valid_count} ảnh, cần ít nhất 10 ảnh.", []
        
        # Keep best encodings (max 50)
        if len(encodings) > 50:
            encodings = encodings[:50]
        
        return True, f"Đăng ký thành công với {valid_count} ảnh khuôn mặt!", encodings
    
    def compare_histograms(self, hist1: List[float], hist2: List[float]) -> float:
        """Compare two histograms using correlation"""
        h1 = np.array(hist1, dtype=np.float32)
        h2 = np.array(hist2, dtype=np.float32)
        return cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)
    
    def verify_face(self, face_image: str, stored_encodings: List[List[float]]) -> Tuple[bool, float, str]:
        """
        Verify if face matches stored encodings.
        
        Returns:
            (is_match, confidence, message)
        """
        try:
            img = self.base64_to_image(face_image)
            
            # Detect face
            face_rect = self.detect_face(img)
            if face_rect is None:
                return False, 0.0, "Không phát hiện được khuôn mặt trong ảnh"
            
            # Extract encoding
            current_encoding = self.extract_face_histogram(img, face_rect)
            
            # Compare with stored encodings
            best_score = 0.0
            for stored_enc in stored_encodings:
                score = self.compare_histograms(current_encoding, stored_enc)
                if score > best_score:
                    best_score = score
            
            # Threshold for match
            threshold = 0.5
            confidence = best_score * 100
            
            if best_score >= threshold:
                return True, confidence, f"Xác thực thành công (độ tin cậy: {confidence:.1f}%)"
            else:
                return False, confidence, f"Khuôn mặt không khớp (độ tin cậy: {confidence:.1f}%)"
                
        except Exception as e:
            print(f"Face verification error: {e}")
            return False, 0.0, f"Lỗi xác thực: {str(e)}"
    
    def save_attendance_image(self, user_id: str, face_image: str, check_type: str) -> str:
        """Save attendance check image"""
        try:
            img = self.base64_to_image(face_image)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{user_id}_{check_type}_{timestamp}.jpg"
            
            attendance_dir = os.path.join(self.uploads_path, "attendance")
            os.makedirs(attendance_dir, exist_ok=True)
            
            filepath = os.path.join(attendance_dir, filename)
            cv2.imwrite(filepath, img)
            
            return f"/uploads/attendance/{filename}"
        except Exception as e:
            print(f"Error saving attendance image: {e}")
            return ""

# Singleton instance
face_service = FaceRecognitionService()
