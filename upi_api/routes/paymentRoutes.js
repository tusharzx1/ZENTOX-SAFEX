const express = require("express");
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

// All payment routes are protected
router.use(authController.protect);

router.post("/record", paymentController.recordTransaction);
router.get("/history", paymentController.getMyHistory);

module.exports = router;
