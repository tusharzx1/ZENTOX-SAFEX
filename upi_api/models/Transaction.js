const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  from_handle: {
    type: String,
    required: [true, "From handle is required"],
  },
  to_handle: {
    type: String,
    required: [true, "To handle is required"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
  },
  tx_hash: {
    type: String,
    unique: true,
    required: [true, "Transaction hash is required"],
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  note: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
