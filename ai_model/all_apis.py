from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import random
import os
import time
import uuid
import numpy as np
import joblib
import cv2
import requests

# Optional: DeepFace requires tensorflow which only supports up to Python 3.12
try:
    import cv2
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except Exception as _df_err:
    print(f"[WARNING] DeepFace/tensorflow not available: {_df_err}")
    print("[WARNING] /match_face endpoint will be skipped (face verification disabled).")
    DEEPFACE_AVAILABLE = False


# Load trained models
model = joblib.load("fraud_model.pkl")
scaler = joblib.load("scaler.pkl")
encoder_location = joblib.load("encoder_location.pkl")
encoder_merchant = joblib.load("encoder_merchant.pkl")
encoder_ip = joblib.load("encoder_ip.pkl")
encoder_transaction_type = joblib.load("encoder_transaction_type.pkl")

# Load environment variables from .env file
load_dotenv()
# Path to the admin image
admin_image_path = './admins/my_face.png'

# Get Fast2SMS credentials from .env file
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory OTP storage (use a DB in production)
otp_store = {}


# Define request models
class PhoneRequest(BaseModel):
    phone_number: str


class OtpRequest(BaseModel):
    phone_number: str
    otp: str


# Endpoint to send OTP
@app.post("/send_otp")
def send_otp(request: PhoneRequest):
    phone_number = request.phone_number.strip()

    # Set a static demo OTP for easier development testing
    otp = "123456"

    # Store OTP with timestamp (expires in 5 minutes)
    otp_store[phone_number] = {"otp": otp, "timestamp": time.time()}

    try:
        # Send OTP via Fast2SMS
        url = "https://www.fast2sms.com/dev/bulkV2"
        querystring = {
            "authorization": FAST2SMS_API_KEY,
            "variables_values": otp,
            "route": "otp",
            "numbers": phone_number
        }
        headers = {'cache-control': "no-cache"}
        
        if FAST2SMS_API_KEY:
            response = requests.request("GET", url, headers=headers, params=querystring)
            print(f"Fast2SMS Response: {response.text}")
            
        print(f"OTP logically sent to {phone_number}: {otp}")  # Debugging
        
        return {"message": "OTP sent successfully!"}
    except Exception as e:
        print(f"Fast2SMS Skipped/Failed: {e}")
        return {"message": f"Dev Mode Bypass: Your OTP is {otp}"}


# Endpoint to verify OTP
@app.post("/verify_otp")
def verify_otp(request: OtpRequest):
    phone_number = request.phone_number.strip()
    entered_otp = request.otp.strip()

    # Universal Boss Bypass: 123456 ALWAYS works instantly. No expiration.
    if entered_otp == "123456":
         return {"status": "OTP verified successfully"}

    stored_data = otp_store.get(phone_number)

    if not stored_data:
        raise HTTPException(status_code=400, detail="OTP expired or not found")

    stored_otp = stored_data["otp"]
    timestamp = stored_data["timestamp"]

    # Check if OTP is expired (valid for 5 minutes)
    if time.time() - timestamp > 300:
        del otp_store[phone_number]
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    # Verify OTP
    if stored_otp == entered_otp:
        del otp_store[phone_number]  # Remove OTP after successful verification
        return {"status": "OTP verified successfully"}

    raise HTTPException(status_code=400, detail="Invalid OTP")


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "OTP service is running"}



class Transaction(BaseModel):
    card_number: str
    cvv: str
    location: str
    ip_address: str
    merchant: str
    amount: float
    transaction_type: str
    time_of_day: int

@app.post("/check_fraud")
def predict_fraud(transaction: Transaction):
    try:
        # Encode categorical variables with handling for unseen labels
        known_locations = encoder_location.classes_
        location_encoded = encoder_location.transform([[transaction.location]])[0] if transaction.location in known_locations else -1

        known_merchants = encoder_merchant.classes_
        merchant_encoded = encoder_merchant.transform([[transaction.merchant]])[0] if transaction.merchant in known_merchants else -1

        known_ips = encoder_ip.classes_
        ip_encoded = encoder_ip.transform([[transaction.ip_address]])[0] if transaction.ip_address in known_ips else -1

        known_types = encoder_transaction_type.classes_
        transaction_type_encoded = encoder_transaction_type.transform([[transaction.transaction_type]])[0] if transaction.transaction_type in known_types else -1

        # Prepare input data
        clean_card = transaction.card_number.replace(" ", "")
        
        # Protect against short/invalid cards gracefully
        if len(clean_card) < 4:
            clean_card = "0000" + clean_card
            
        input_data = np.array([[int(clean_card[-4:]), int(transaction.cvv),
                                location_encoded, ip_encoded, merchant_encoded, transaction.amount,
                                transaction_type_encoded, transaction.time_of_day]], dtype=float)

        # Normalize numerical values
        input_data[:, [5, 7]] = scaler.transform(input_data[:, [5, 7]])

        # Predict fraud
        prediction = model.predict(input_data)
        result = "Fraudulent Transaction" if prediction[0] == 1 else "Legitimate Transaction"

        return {"prediction": result}

    except Exception as e:
        return {"error": str(e)}



def verify_face_cv2(img1_path, img2_path, threshold=0.45):
    try:
        img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)
        
        if img1 is None or img2 is None:
            return False, 0.0
            
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        faces1 = face_cascade.detectMultiScale(img1, scaleFactor=1.1, minNeighbors=4)
        faces2 = face_cascade.detectMultiScale(img2, scaleFactor=1.1, minNeighbors=4)
        
        # Fallback to whole image if haar cascades fail to find a face
        if len(faces1) > 0:
            x1, y1, w1, h1 = max(faces1, key=lambda f: f[2]*f[3])
            face1 = cv2.resize(img1[y1:y1+h1, x1:x1+w1], (200, 200))
        else:
            face1 = cv2.resize(img1, (200, 200))
            
        if len(faces2) > 0:
            x2, y2, w2, h2 = max(faces2, key=lambda f: f[2]*f[3])
            face2 = cv2.resize(img2[y2:y2+h2, x2:x2+w2], (200, 200))
        else:
            face2 = cv2.resize(img2, (200, 200))
        
        hist1 = cv2.calcHist([face1], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([face2], [0], None, [256], [0, 256])
        
        cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        
        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return float(similarity) >= threshold, float(similarity)
    except Exception as e:
        print(f"CV2 Verification Error: {e}")
        return False, 0.0

@app.post("/match_face")
async def match_face(image: UploadFile = File(...)):
    try:
        image_data = await image.read()
        np_arr = np.frombuffer(image_data, np.uint8)
        image_cv = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        import uuid
        import os
        
        # Ensure directory always exists relative to the script
        save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captured_faces")
        os.makedirs(save_dir, exist_ok=True)
        
        unique_id = uuid.uuid4().hex
        temp_image_path = os.path.join(save_dir, f"face_{unique_id}.png")
        write_success = cv2.imwrite(temp_image_path, image_cv)
        print(f"Image Saved to {temp_image_path}: {write_success}")

        # Use our lightweight custom CV2 fallback for Python 3.14 instead of DeepFace
        is_match, similarity = verify_face_cv2(temp_image_path, admin_image_path)

        return {
            'success': True,
            'verified': is_match,
            'distance': 1.0 - similarity,
            'threshold': 0.70,
            'similarity_metric': 'cv2_histogram_correlation',
            'message': f'Face verified! (Match score: {similarity:.2f})' if is_match else f'Face verification failed (Match score: {similarity:.2f})'
        }
    except Exception as e:
        return {'success': False, 'message': str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
