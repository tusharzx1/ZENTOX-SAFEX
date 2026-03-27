const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

exports.recordTransaction = async (req, res, next) => {
  try {
    const { from_handle, to_handle, amount, tx_hash, note } = req.body;

    if (!from_handle || !to_handle || !amount || !tx_hash) {
      return next(new AppError("Missing transaction details", 400));
    }

    const transaction = await Transaction.create({
      from_handle,
      to_handle,
      amount,
      tx_hash,
      note,
      status: "success", // Ideally confirmed via webhooks/ethers on backend later
    });

    res.status(201).json({
      success: true,
      data: {
        transaction,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyHistory = async (req, res, next) => {
  try {
    const handle = req.user.upi_handle;
    
    // Find transactions where user is either sender or receiver
    const history = await Transaction.find({
      $or: [{ from_handle: handle }, { to_handle: handle }],
    }).sort("-timestamp");

    res.status(200).json({
      success: true,
      results: history.length,
      data: {
        history,
      },
    });
  } catch (err) {
    next(err);
  }
};
