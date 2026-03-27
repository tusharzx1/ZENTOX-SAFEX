const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Public handle resolution
router.get("/resolve/:handle", userController.resolveHandle);

// Protected routes (Only logged in users can reach)
router.use(authController.protect);

router.get("/me", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

router.patch("/updateMe", userController.updateProfile);

module.exports = router;
