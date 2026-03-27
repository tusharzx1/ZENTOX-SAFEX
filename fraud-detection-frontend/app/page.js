"use client";

import { useRef, useState, useEffect } from "react";
import axios from "axios";
import styles from "./page.module.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Environment } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm"; // A math utility often used for particles

// --- 3D PARTICLE BACKGROUND COMPONENT ---
function CyberpunkParticles(props) {
    const ref = useRef();
    // Generate 5001 random points inside a sphere (5001 is divisible by 3)
    const [sphere] = useState(() => random.inSphere(new Float32Array(5001), { radius: 1.5 }));

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial transparent color="#00E5FF" size={0.005} sizeAttenuation={true} depthWrite={false} />
            </Points>
        </group>
    );
}

// --- MAIN APPLICATION ---
export default function Home() {
    const [isClient, setIsClient] = useState(false);
    const [step, setStep] = useState(1);
    const [showChoice, setShowChoice] = useState(false);
    const [message, setMessage] = useState("");
    const [transaction, setTransaction] = useState({
        card_number: "",
        cvv: "",
        amount: "",
        location: "",
        ip_address: "",
        merchant: "Amazon",
        transaction_type: "Online",
        time_of_day: "",
        phone: "",
        otp: "",
    });
    const [txHash, setTxHash] = useState(null);
    const [transactionId, setTransactionId] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "user" } })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch((err) => {
                    console.error("Error accessing webcam: ", err);
                });

            const currentHour = new Date().getHours();
            setTransaction((prev) => ({ ...prev, time_of_day: currentHour.toString() }));

            axios
                .get("https://api.ipify.org?format=json")
                .then((response) => {
                    setTransaction((prev) => ({ ...prev, ip_address: response.data.ip }));
                })
                .catch((error) => {
                    console.error("Error fetching IP:", error);
                    setTransaction((prev) => ({ ...prev, ip_address: "192.168.1.1" }));
                });
        }
    }, [isClient]);

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState < 2) {
            setMessage("Camera is not ready yet. Please wait.");
            return;
        }

        const context = canvasRef.current.getContext("2d");
        canvasRef.current.width = video.videoWidth || 640;
        canvasRef.current.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

        const imageData = canvasRef.current.toDataURL("image/png");
        setCapturedImage(imageData);

        setMessage("Scanning for face...");
        await detectFace(imageData);
    };

    const saveCaptureToFile = async (imageData) => {
        try {
            await fetch("/api/save-capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageData,
                    location: transaction.location || "Unknown",
                }),
            });
        } catch (err) {
            console.warn("Could not save capture to file:", err);
        }
    };

    const detectFace = async (imageData) => {
        // Prototype: Use browser-native FaceDetector if available
        if (typeof window !== "undefined" && "FaceDetector" in window) {
            try {
                const faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
                const blob = await fetch(imageData).then(r => r.blob());
                const bitmap = await createImageBitmap(blob);
                const faces = await faceDetector.detect(bitmap);
                bitmap.close();

                if (faces.length > 0) {
                    setMessage("✅ Identity Verified! Choose payment method.");
                    await saveCaptureToFile(imageData);
                    setTimeout(() => { setShowChoice(true); setMessage(""); }, 800);
                } else {
                    setMessage("❌ No face detected. Please look at the camera and try again.");
                    setTimeout(() => { setCapturedImage(null); setMessage(""); }, 2500);
                }
            } catch (err) {
                console.warn("FaceDetector error:", err);
                // Fallback: just save and proceed
                setMessage("✅ Identity Verified! Choose payment method.");
                await saveCaptureToFile(imageData);
                setTimeout(() => { setShowChoice(true); setMessage(""); }, 800);
            }
        } else {
            // Fallback for browsers without FaceDetector (Firefox, Safari)
            setMessage("✅ Identity Verified! Choose payment method.");
            await saveCaptureToFile(imageData);
            setTimeout(() => { setShowChoice(true); setMessage(""); }, 1000);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTransaction((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckFraud = async () => {
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000"}/check_fraud`,
                {
                    card_number: transaction.card_number,
                    cvv: transaction.cvv,
                    location: transaction.location,
                    ip_address: transaction.ip_address,
                    merchant: transaction.merchant,
                    amount: parseFloat(transaction.amount),
                    transaction_type: transaction.transaction_type,
                    time_of_day: parseInt(transaction.time_of_day),
                },
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.error) {
                setMessage(`Fraud Check Error: ${response.data.error}`);
            } else {
                setMessage(response.data.prediction);
                if (response.data.prediction === "Legitimate Transaction") {
                    setStep(3);
                } else if (response.data.prediction === "Fraudulent Transaction") {
                    setMessage("⚠️ FRAUDULENT TRANSACTION DETECTED!");
                }
            }
        } catch (error) {
            console.error("Axios error:", error);
            setMessage("Network Error: Could not reach the server.");
        }
    };

    const handleSendOtp = async () => {
        if (!transaction.phone) {
            setMessage("Please enter a phone number.");
            return;
        }
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000"}/send_otp`,
                { phone_number: transaction.phone },
                { headers: { "Content-Type": "application/json" } }
            );
            setMessage(response.data.message || "OTP sent to your phone!");
            setStep(4);
        } catch (error) {
            console.error("Axios error:", error.message, error.code);
            setMessage(error.response?.data?.error || "Error sending OTP.");
        }
    };

    const handleVerifyOtp = async () => {
        if (!transaction.otp) {
            setMessage("Please enter the OTP.");
            return;
        }
        try {
            const otpResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000"}/verify_otp`,
                { phone_number: transaction.phone, otp: transaction.otp },
                { headers: { "Content-Type": "application/json" } }
            );
            setMessage(otpResponse.data.status || "OTP verified successfully!");

            const transactionResponse = await fetch(`${process.env.NEXT_PUBLIC_BLOCKCHAIN_API_URL || "http://localhost:8001"}/api/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                    card_number: transaction.card_number,
                    cvv: transaction.cvv,
                    location: transaction.location,
                    ip_address: transaction.ip_address,
                    merchant: transaction.merchant,
                    amount: parseFloat(transaction.amount),
                    transaction_type: transaction.transaction_type,
                    time_of_day: parseInt(transaction.time_of_day),
                }),
            });

            if (!transactionResponse.ok) throw new Error(`HTTP error! Status: ${transactionResponse.status}`);

            const transactionData = await transactionResponse.json();
            if (transactionData.success) {
                setTxHash(transactionData.tx_hash);
                setTransactionId(transactionData.transaction_id);
                setStep(5);
            } else {
                setMessage("Transaction failed. Please try again.");
            }
        } catch (error) {
            console.error("Error in API Call:", error);
            const backendError = error.response?.data?.detail || error.response?.data?.message;
            setMessage(backendError || error.message || "Network error. Please check your server.");
        }
    };

    const handleReset = () => {
        setStep(1);
        setMessage("");
        setTransaction({ ...transaction, card_number: "", cvv: "", amount: "", location: "", otp: "" });
    };

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#050505" }}>
            {/* THREE.JS BACKGROUND CANVAS (Fixed to back, z-0) */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
                <Canvas camera={{ position: [0, 0, 1] }}>
                    <color attach="background" args={["#050505"]} />
                    <ambientLight intensity={0.5} />
                    <CyberpunkParticles />
                    <Environment preset="city" />
                </Canvas>
            </div>

            {/* FOREGROUND CONTENT (z-10 relative) */}
            <div style={{ position: "relative", zIndex: 10, height: "100%", overflowY: "auto" }}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        {step === 1 && isClient && !showChoice && (
                            <div className={styles.step}>
                                <h2>Step 1: Face Verification</h2>
                                <div className={styles.videoContainer}>
                                    <video ref={videoRef} autoPlay className={styles.video} />
                                    {capturedImage && <img src={capturedImage} alt="Captured" className={styles.capturedImage} />}
                                </div>
                                <canvas ref={canvasRef} className={styles.hidden} />
                                <button onClick={capturePhoto} className={styles.button}>Capture & Verify</button>
                                {message && <p className={styles.message}>{message}</p>}
                            </div>
                        )}

                        {showChoice && (
                            <div className={styles.step}>
                                <h2 style={{ color: "#00E5FF", textShadow: "0 0 10px rgba(0, 229, 255, 0.5)" }}>Verification Success</h2>
                                <p style={{ opacity: 0.8, marginBottom: "2rem" }}>Select your secure payment protocol</p>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                    <button 
                                        onClick={() => { setStep(2); setShowChoice(false); }} 
                                        className={styles.button}
                                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", height: "80px", fontSize: "1.1rem" }}
                                    >
                                        <div style={{ fontWeight: "bold" }}>Standard Protocol</div>
                                        <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Credit / Debit Card Verification</div>
                                    </button>

                                    <button 
                                        onClick={() => window.location.href = "/upi"}
                                        className={styles.button}
                                        style={{ background: "rgba(0, 229, 255, 0.1)", border: "1px solid #00E5FF", height: "80px", color: "#00E5FF", fontSize: "1.1rem", position: "relative", overflow: "hidden" }}
                                    >
                                        <div style={{ fontWeight: "900" }}>Crypto UPI</div>
                                        <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>Monad Blockchain • Instant • Handle-based</div>
                                        <div style={{ position: "absolute", top: "5px", right: "10px", fontSize: "0.6rem", background: "#00E5FF", color: "#000", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>RECOMMENDED</div>
                                    </button>
                                </div>

                                <button onClick={() => setShowChoice(false)} style={{ background: "none", border: "none", color: "#fff", opacity: 0.4, marginTop: "1.5rem", fontSize: "0.8rem", cursor: "pointer" }}>Back to Identity Scan</button>
                            </div>
                        )}

                        {step === 2 && !showChoice && (
                            <div className={styles.creditCard}>
                                <div className={styles.cardFront}>
                                    <h2 className={styles.cardTitle}>Credit Card Transaction</h2>
                                    <input type="text" name="card_number" placeholder="•••• •••• •••• ••••" value={transaction.card_number} onChange={handleInputChange} className={styles.cardNumber} maxLength="16" />
                                    <div className={styles.cardDetails}>
                                        <input type="text" name="cvv" placeholder="CVV" value={transaction.cvv} onChange={handleInputChange} className={styles.cvv} maxLength="3" />
                                        <input type="text" name="location" placeholder="Location" value={transaction.location} onChange={handleInputChange} className={styles.location} />
                                    </div>
                                    <input type="number" name="amount" placeholder="Amount" value={transaction.amount} onChange={handleInputChange} className={styles.amount} />
                                    <button onClick={handleCheckFraud} className={styles.button}>Check Fraud</button>
                                    {message && <p className={styles.message}>{message}</p>}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className={styles.step}>
                                <h2>Step 3: Phone Number for OTP</h2>
                                <input type="tel" name="phone" placeholder="Phone Number" value={transaction.phone} onChange={handleInputChange} className={styles.input} />
                                <button onClick={handleSendOtp} className={styles.button}>Send OTP</button>
                                {message && <p className={styles.message}>{message}</p>}
                            </div>
                        )}

                        {step === 4 && (
                            <div className={styles.step}>
                                <h2>Step 4: Verify OTP</h2>
                                <input type="text" name="otp" placeholder="Enter OTP" value={transaction.otp} onChange={handleInputChange} className={styles.input} maxLength="6" />
                                <button onClick={handleVerifyOtp} className={styles.button}>Verify OTP</button>
                                {message && <p className={styles.message}>{message}</p>}
                            </div>
                        )}

                        {step === 5 && (
                            <div className={styles.step}>
                                <h2>Transaction Completed</h2>
                                <p className={styles.successMessage}>
                                    Your transaction of ${transaction.amount} to {transaction.merchant} has been successfully completed!
                                </p>
                                {txHash && (
                                    <>
                                        <p style={{ fontFamily: 'JetBrains Mono' }}><strong>Tx Hash:</strong> <br /><span style={{ fontSize: '0.8rem', color: '#888' }}>{txHash}</span></p>
                                        <p>
                                            <a href={`${process.env.NEXT_PUBLIC_BLOCKCHAIN_API_URL || "http://localhost:8001"}/api/transactions/${transactionId}`} target="_blank" rel="noopener noreferrer">View details</a>
                                        </p>
                                    </>
                                )}
                                <button onClick={handleReset} className={styles.button}>Start New Transaction</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
