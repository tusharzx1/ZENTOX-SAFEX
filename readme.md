# Cyberpunk Credit Card Fraud Detector

An immersive, AI-powered and blockchain-secured Web3 fraud detection system. It features a dark cyberpunk 3D user interface, hardware-level facial biometric verification, machine-learning anomaly detection, and immutable on-chain transaction logging.

## Core Features

1. **Hardware Facial Biometrics**: Authenticates the user via live webcam using OpenCV Haar Cascades and dense structural histogram correlation (fully customized for Python 3.14+ compatibility). All scanned faces are permanently logged with secure UUIDs.
2. **AI Fraud Detection API**: A FastAPI backend running a Scikit-Learn Random Forest model that evaluates transaction parameters (location, IP address, merchant, time, amount) to instantly flag anomalies.
3. **2FA Twilio Integration**: Transactions flagged as legitimate still undergo a strict SMS OTP (One-Time Password) challenge before approval.
4. **Immutable Ledger Logging**: Approved transactions are permanently written to an **On-Chain Ethereum** smart contract, producing a verified Transaction Hash (TxHash).
5. **Interactive 3D UI**: A fully immersive, dark-themed "Terminal Hacker" interface built with React Three Fiber, featuring a rotating matrix-style particle mesh background.

---

## Technology Stack

### Frontend (User Interface)
- **Next.js & React**: Core web framework.
- **Three.js & React Three Fiber (@react-three/drei)**: Renders the immersive 3D particle physics background.
- **Vanilla CSS Modules**: Custom-built cyberpunk styling (JetBrains Mono, Neon Green `#39FF14`, floating glassmorphic panels).
- **Axios**: Handles API proxying and network calls to the backend components.

### AI & Backend Services
- **FastAPI & Uvicorn**: High-performance asynchronous Python API server (runs on port `8000`).
- **OpenCV (cv2) & Numpy**: Powers the structural biometric face verification and identity matching algorithm.
- **Scikit-Learn**: Drives the statistical machine learning model predicting transaction validity.
- **Twilio API**: Handles the delivery of SMS OTP challenges for 2-Factor Authentication.

### On-Chain Blockchain Integration
- **Hardhat**: Acts as the local **Ethereum Testnet Node** (running internally on port `8545`). The smart contract is deployed on this simulated blockchain.
- **Solidity**: The smart contract programming language used to securely store the transaction records.
- **Node.js & Express API**: Middleware API (running on port `8001`) that uses **Ethers.js** to bridge the React frontend directly to the Hardhat Ethereum node.

---

## How to Run the Application

The application consists of three decoupled microservices. They must all run concurrently in separate terminals.

### 1. Start the AI & Biometrics API (Terminal 1)
```powershell
cd ai_model
.\venv\Scripts\activate
# Start the FastAPI server on port 8000
python -m uvicorn all_apis:app --host 0.0.0.0 --port 8000
```
*(Make sure you have configured your Twilio credentials in `ai_model/.env`!)*

### 2. Start the Ethereum Blockchain Node (Terminal 2)
```powershell
cd blockchain_api
# Boots up the local Hardhat Ethereum Network
npx hardhat node
```

### 3. Deploy Contract & Start Blockchain Middleware API (Terminal 3)
```powershell
cd blockchain_api
# Deploy the smart contract to the local Hardhat network from Terminal 2
npx hardhat run --network localhost scripts/deploy.js
# Start the Express API on port 8001
node api.js
```

### 4. Start the 3D Cyberpunk Frontend (Terminal 4)
```powershell
cd fraud-detection-frontend
# Start the Next.js server on port 3000
npm run dev
```

### 5. Google Chrome Camera Configuration
To allow the local environment to access your webcam for Face Verification:
1. Open Google Chrome and go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add `http://localhost:3000` to the list of origins.
3. Enable the flag and click **Relaunch**.
4. Open the app at [http://localhost:3000](http://localhost:3000) and authorize the transaction!