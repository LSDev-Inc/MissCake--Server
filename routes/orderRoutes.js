const express = require("express");
const {
  createCheckoutSession,
  listMyOrders,
  listAllOrdersForStaff,
  updateOrderForStaff,
  cancelPendingOrder,
} = require("../controllers/orderController");
const { protect, adminOrOwnerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/checkout-session", createCheckoutSession);
router.get("/my-orders", listMyOrders);
router.delete("/cancel-pending/:id", cancelPendingOrder);
router.get("/staff", adminOrOwnerOnly, listAllOrdersForStaff);
router.put("/staff/:id", adminOrOwnerOnly, updateOrderForStaff);

module.exports = router;
