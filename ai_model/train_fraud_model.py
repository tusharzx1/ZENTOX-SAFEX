import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Load dataset
df = pd.read_csv("transactions.csv")

# Encode categorical variables (convert text to numbers)
encoder_location = LabelEncoder()
df["location"] = encoder_location.fit_transform(df["location"])

encoder_merchant = LabelEncoder()
df["merchant"] = encoder_merchant.fit_transform(df["merchant"])

encoder_ip = LabelEncoder()
df["ip_address"] = encoder_ip.fit_transform(df["ip_address"])

encoder_transaction_type = LabelEncoder()
df["transaction_type"] = encoder_transaction_type.fit_transform(df["transaction_type"])

# Normalize numerical values (Amount & Time of Day)
scaler = StandardScaler()
df[["amount", "time_of_day"]] = scaler.fit_transform(df[["amount", "time_of_day"]])

# Define features (X) and target (y)
X = df.drop(columns=["fraudulent"])
y = df["fraudulent"]

# Split dataset (80% training, 20% testing)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Train a Random Forest model
model = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
model.fit(X_train, y_train)

# Save trained model and encoders
joblib.dump(model, "fraud_model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(encoder_location, "encoder_location.pkl")
joblib.dump(encoder_merchant, "encoder_merchant.pkl")
joblib.dump(encoder_ip, "encoder_ip.pkl")
joblib.dump(encoder_transaction_type, "encoder_transaction_type.pkl")

print("✅ Model trained and saved successfully!")
