"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Environment } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";
import { Send, Wallet, User, History, QrCode, Search, CheckCircle, Loader2 } from "lucide-react";
import styles from "../page.module.css";
import { UPI_CONTRACT_ADDRESS, UPI_ABI } from "../../utils/upiConstants";

// --- 3D PARTICLE BACKGROUND ---
function CyberpunkParticles(props) {
  const ref = useRef();
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

export default function CryptoUPI() {
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState("send"); // send, profile, history
  const [account, setAccount] = useState(null);
  const [jwt, setJwt] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form States
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [recipientHandle, setRecipientHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  
  // User Data
  const [userData, setUserData] = useState(null);
  const [onChainHandle, setOnChainHandle] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setIsClient(true);
    const storedJwt = localStorage.getItem("upi_jwt");
    if (storedJwt) {
      setJwt(storedJwt);
      fetchUserProfile(storedJwt);
    }
  }, []);

  useEffect(() => {
    if (jwt && activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, jwt]);

  const fetchUserProfile = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_UPI_API_URL || "http://localhost:5000"}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUserData(res.data.data.user);
        checkOnChainHandle(res.data.data.user.wallet_address);
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    }
  };

  const fetchHistory = async () => {
    if (!jwt) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_UPI_API_URL || "http://localhost:5000"}/api/v1/payments/history`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      if (res.data.success) {
        setHistory(res.data.data.history);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    }
  };

  const checkOnChainHandle = async (address) => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(UPI_CONTRACT_ADDRESS, UPI_ABI, provider);
      const handle = await contract.addressToHandle(address);
      setOnChainHandle(handle);
    } catch (err) {
      console.warn("Handle lookup failed:", err);
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        setMessage("Wallet connected: " + accounts[0].slice(0, 6) + "...");
        checkOnChainHandle(accounts[0]);
      } catch (err) {
        setMessage("Failed to connect wallet.");
      }
    } else {
      setMessage("Please install MetaMask!");
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!account) {
      setMessage("Please connect your wallet first!");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isRegistering ? "/api/v1/users/signup" : "/api/v1/users/login";
      const payload = isRegistering 
        ? { upi_handle: handle, wallet_address: account, password } 
        : { upi_handle: handle, password };

      const res = await axios.post(`${process.env.NEXT_PUBLIC_UPI_API_URL || "http://localhost:5000"}${endpoint}`, payload);
      
      if (res.data.success) {
        setJwt(res.data.token);
        localStorage.setItem("upi_jwt", res.data.token);
        setUserData(res.data.data.user);
        setMessage(isRegistering ? "Registration successful!" : "Login successful!");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOnChain = async () => {
    if (!window.ethereum || !account) return;
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(UPI_CONTRACT_ADDRESS, UPI_ABI, signer);
      
      const tx = await contract.registerHandle(userData.upi_handle);
      setMessage("Registering handle on blockchain...");
      await tx.wait();
      
      setOnChainHandle(userData.upi_handle);
      setMessage("Handle registered on blockchain! ✅");
    } catch (err) {
      setMessage("On-chain registration failed: " + (err.reason || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!window.ethereum || !account) {
      setMessage("Wallet not connected.");
      return;
    }

    if (!recipientHandle || !amount) {
      setMessage("Recipient and amount are required!");
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(UPI_CONTRACT_ADDRESS, UPI_ABI, signer);
      
      const amountInWei = ethers.parseEther(amount.toString());
      const tx = await contract.payByHandle(recipientHandle, note, { value: amountInWei });
      
      setMessage("Payment pending... ⏳");
      const receipt = await tx.wait();
      
      // Sync with backend
      await axios.post(`${process.env.NEXT_PUBLIC_UPI_API_URL || "http://localhost:5000"}/api/v1/payments/record`, {
        from_handle: userData.upi_handle,
        to_handle: recipientHandle,
        amount: parseFloat(amount),
        tx_hash: receipt.hash,
        note: note
      }, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      setMessage(`Payment of ${amount} MON sent to @${recipientHandle}! 🚀`);
      setRecipientHandle("");
      setAmount("");
      setNote("");
    } catch (err) {
      setMessage("Payment failed: " + (err.reason || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setJwt(null);
    localStorage.removeItem("upi_jwt");
    setUserData(null);
    setOnChainHandle("");
    setHistory([]);
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#050505", color: "#fff" }}>
      {/* 3D BACKGROUND */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 1] }}>
          <color attach="background" args={["#050505"]} />
          <ambientLight intensity={0.5} />
          {isClient && <CyberpunkParticles />}
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* UI OVERLAY */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div className={styles.card} style={{ width: "95%", maxWidth: "450px", backdropFilter: "blur(20px)", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
          
          <header style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "800", background: "linear-gradient(90deg, #00E5FF, #00FF95)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CRYPTO UPI
            </h1>
            <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>Secure • Instant • Blockchain</p>
          </header>

          {!jwt ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <button 
                onClick={connectWallet} 
                className={styles.button} 
                style={{ background: account ? "rgba(0, 255, 149, 0.1)" : "rgba(0, 229, 255, 0.1)", border: `1px solid ${account ? "#00FF95" : "#00E5FF"}` }}
              >
                <Wallet size={18} style={{ marginRight: "10px" }} />
                {account ? `${account.slice(0, 10)}...${account.slice(-8)}` : "Connect Wallet"}
              </button>

              <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                  <input 
                    type="text" 
                    placeholder="UPI Handle (e.g. alice)" 
                    value={handle} 
                    onChange={(e) => setHandle(e.target.value)}
                    style={{ width: "100%", padding: "12px 12px 12px 40px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff" }}
                  />
                </div>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff" }}
                />
                <button type="submit" disabled={isLoading} className={styles.button} style={{ background: "#00E5FF", color: "#000", fontWeight: "bold" }}>
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? "CREATE ACCOUNT" : "LOGIN")}
                </button>
              </form>

              <p style={{ textAlign: "center", fontSize: "0.85rem", opacity: 0.7 }}>
                {isRegistering ? "Already have a handle?" : "New to Crypto UPI?"}{" "}
                <span 
                  onClick={() => setIsRegistering(!isRegistering)} 
                  style={{ color: "#00E5FF", cursor: "pointer", fontWeight: "bold" }}
                >
                  {isRegistering ? "Login here" : "Register handle"}
                </span>
              </p>
            </div>
          ) : (
            <div>
              {/* LOGGED IN DASHBOARD */}
              <nav style={{ display: "flex", justifyContent: "space-around", marginBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                <button onClick={() => setActiveTab("send")} style={{ background: "none", border: "none", color: activeTab === "send" ? "#00E5FF" : "#fff", opacity: activeTab === "send" ? 1 : 0.5, cursor: "pointer" }}><Send size={20} /></button>
                <button onClick={() => setActiveTab("history")} style={{ background: "none", border: "none", color: activeTab === "history" ? "#00E5FF" : "#fff", opacity: activeTab === "history" ? 1 : 0.5, cursor: "pointer" }}><History size={20} /></button>
                <button onClick={() => setActiveTab("profile")} style={{ background: "none", border: "none", color: activeTab === "profile" ? "#00E5FF" : "#fff", opacity: activeTab === "profile" ? 1 : 0.5, cursor: "pointer" }}><User size={20} /></button>
              </nav>

              {activeTab === "send" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                     <div style={{ position: "relative", flex: 1 }}>
                        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                        <input 
                          type="text" 
                          placeholder="Recipient Handle" 
                          value={recipientHandle}
                          onChange={(e) => setRecipientHandle(e.target.value)}
                          style={{ width: "100%", padding: "12px 12px 12px 40px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff" }}
                        />
                     </div>
                     <button style={{ padding: "0 15px", background: "rgba(0,229,255,0.1)", border: "1px solid #00E5FF", borderRadius: "10px", color: "#00E5FF" }}><QrCode size={18} /></button>
                  </div>
                  <input 
                    type="number" 
                    placeholder="Amount (MON)" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: "100%", padding: "15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontSize: "1.2rem", fontWeight: "bold" }}
                  />
                  <input 
                    type="text" 
                    placeholder="Add a note (Optional)" 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff" }}
                  />
                  <button onClick={handlePayment} disabled={isLoading} className={styles.button} style={{ background: "#00E5FF", color: "#000", fontWeight: "900", marginTop: "1rem" }}>
                    {isLoading ? "PROCESSING..." : "PAY NOW"}
                  </button>
                </div>
              )}

              {activeTab === "history" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
                   {history.length === 0 ? (
                      <p style={{ textAlign: "center", opacity: 0.5, marginTop: "2rem" }}>No transactions found.</p>
                   ) : (
                      history.map((tx) => (
                         <div key={tx._id} style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "10px", borderLeft: tx.from_handle === userData.upi_handle ? "3px solid #ff4b4b" : "3px solid #00FF95" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                               <span style={{ fontWeight: "bold" }}>{tx.from_handle === userData.upi_handle ? `@${tx.to_handle}` : `@${tx.from_handle}`}</span>
                               <span style={{ color: tx.from_handle === userData.upi_handle ? "#ff4b4b" : "#00FF95", fontWeight: "900" }}>
                                  {tx.from_handle === userData.upi_handle ? "-" : "+"}{tx.amount} MON
                               </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.5 }}>
                               <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                               <a href={`https://testnet.monadexplorer.com/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" style={{ color: "#00E5FF" }}>View Tx</a>
                            </div>
                         </div>
                      ))
                   )}
                </div>
              )}

              {activeTab === "profile" && (
                <div style={{ textAlign: "center" }}>
                   <div style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 1.5rem", border: "2px solid #00E5FF", padding: "5px" }}>
                      <img src={userData?.profile_image} style={{ width: "100%", height: "100%", borderRadius: "50%" }} alt="Profile" />
                   </div>
                   <h2 style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>@{userData?.upi_handle}</h2>
                   <p style={{ fontSize: "0.8rem", opacity: 0.5, marginBottom: "1rem" }}>{userData?.wallet_address}</p>
                   
                   {!onChainHandle ? (
                      <button onClick={handleRegisterOnChain} disabled={isLoading} className={styles.button} style={{ border: "1px solid #00FF95", color: "#00FF95", marginBottom: "1rem" }}>
                         {isLoading ? "WAITING..." : "REGISTER ON BLOCKCHAIN"}
                      </button>
                   ) : (
                      <div style={{ marginBottom: "1.5rem", color: "#00FF95", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                         <CheckCircle size={16} /> Handle Verified On-Chain
                      </div>
                   )}

                   <button onClick={logout} className={styles.button} style={{ border: "1px solid rgba(255, 60, 60, 0.3)", color: "#FF3C3C" }}>LOGOUT</button>
                </div>
              )}
            </div>
          )}


          {message && (
             <div style={{ marginTop: "1.5rem", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", fontSize: "0.85rem", color: "#00E5FF", textAlign: "center", border: "1px solid rgba(0,229,255,0.1)" }}>
                {message}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
