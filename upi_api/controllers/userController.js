const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.resolveHandle = async (req, res, next) => {
  try {
    const { handle } = req.params;
    
    const user = await User.findOne({ upi_handle: handle.toLowerCase() });
    
    if (!user) {
      return next(new AppError("UPI handle not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        upi_handle: user.upi_handle,
        wallet_address: user.wallet_address,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    // Only allow updating phone, profile_image, location
    const { phone, profile_image, location } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { phone, profile_image, location },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};
