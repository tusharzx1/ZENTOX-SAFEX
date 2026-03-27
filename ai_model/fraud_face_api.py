from fastapi import FastAPI, File, UploadFile, Form
import cv2
import face_recognition
import numpy as np
import joblib
from twilio.rest import Client
import random

app = FastAPI()

# Load fraud detection model
fraud_model = joblib.load("fraud_model.pkl")

# Load known faces
known_face_encodings = []
known_face_names = []

# Load a known face (Replace with actual stored images)
known_image = face_recognition.load_image_file("known_faces/person1.jpg")
known_face_encodings.append(face_recognition.face_encodings(known_image)[0])
known_face_names.append("John Doe")

# Twilio Credentials (Replace with actual keys)
TWILIO_ACCOUNT_SID = "your_twilio_account_sid"
TWILIO_AUTH_TOKEN = "your_twilio_auth_token"
TWILIO_PHONE_NUMBER = "+1234567890"

# Store OTPs
otp_store = {}

# Twilio Client
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.post("/detect_face")
async def detect_face(image: UploadFile = File(...)):
    """ Detects face in the image """
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    face_locations = face_recognition.face_locations(rgb_img)
    
    return {"faces_detected": len(face_locations)}

@app.post("/recognize_face")
async def recognize_face(image: UploadFile = File(...)):
    """ Checks if face matches known database """
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_img)
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)

    for face_encoding in face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
        if True in matches:
            match_index = matches.index(True)
            return {"recognized_person": known_face_names[match_index]}
    
    return {"recognized_person": "Unknown"}

@app.post("/check_fraud")
async def check_fraud(amount: float = Form(...), location: str = Form(...), phone_number: str = Form(...)):
    """ Checks if a transaction is fraudulent """
    # Sample fraud detection (Replace with actual model logic)
    fraud_prediction = fraud_model.predict([[amount]])[0]  # Placeholder: Use more features in real model

    if fraud_prediction == 1:
        # Generate and store OTP
        otp = random.randint(100000, 999999)
        otp_store[phone_number] = otp

        # Send OTP via Twilio
        client.messages.create(
            body=f"Your OTP code is: {otp}",
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        return {"status": "Fraud detected", "otp_sent": True}
    
    return {"status": "Legitimate transaction", "otp_sent": False}

@app.post("/verify_otp")
async def verify_otp(phone_number: str = Form(...), otp: int = Form(...)):
    """ Verifies OTP """
    if phone_number in otp_store and otp_store[phone_number] == otp:
        del otp_store[phone_number]
        return {"status": "OTP verified"}
    return {"status": "Invalid OTP"}
