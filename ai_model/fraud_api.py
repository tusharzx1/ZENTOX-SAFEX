from fastapi import FastAPI
import joblib
import numpy as np
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
# Load trained models
model = joblib.load("fraud_model.pkl")
scaler = joblib.load("scaler.pkl")
encoder_location = joblib.load("encoder_location.pkl")
encoder_merchant = joblib.load("encoder_merchant.pkl")
encoder_ip = joblib.load("encoder_ip.pkl")
encoder_transaction_type = joblib.load("encoder_transaction_type.pkl")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        input_data = np.array([[int(transaction.card_number[-4:]), int(transaction.cvv),
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