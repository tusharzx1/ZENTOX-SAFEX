const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("--------------------------------------------------");
  console.log("🚀 Starting CryptoUPI Deployment...");
  console.log("--------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("👤 Deployer:", deployer.address);
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")");

  // 1. Get Contract Factory
  const CryptoUPI = await hre.ethers.getContractFactory("CryptoUPI");

  // 2. Deploy Contract
  console.log("📦 Deploying CryptoUPI...");
  const cryptoUPI = await CryptoUPI.deploy();

  // 3. Wait for Deployment
  console.log("⏳ Waiting for transaction confirmation...");
  await cryptoUPI.deployed();

  console.log("✅ CryptoUPI deployed to:", cryptoUPI.address);

  // 4. Update contract-address.json (Merge with existing)
  const addressFilePath = path.join(__dirname, "../contract-address.json");
  let addresses = {};

  if (fs.existsSync(addressFilePath)) {
    try {
      const existingData = fs.readFileSync(addressFilePath, "utf8");
      addresses = JSON.parse(existingData);
    } catch (e) {
      console.warn("⚠️ Failed to parse existing contract-address.json, starting fresh.");
    }
  }

  addresses.CryptoUPI = cryptoUPI.address;

  fs.writeFileSync(
    addressFilePath,
    JSON.stringify(addresses, null, 2)
  );

  console.log("📝 Updated contract-address.json");
  console.log("--------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
