const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  upi_handle: {
    type: String,
    required: [true, "UPI handle is required"],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, "Handle must be at least 3 characters"],
  },
  wallet_address: {
    type: String,
    required: [true, "Wallet address is required"],
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  profile_image: {
    type: String,
    default: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  location: {
    address: String,
    latitude: Number,
    longitude: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to check password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
