const express = require("express");
const {
  getDashboardStats,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listAuditLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/adminController");
const { protect, adminOrOwnerOnly, ownerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOrOwnerOnly);

router.get("/stats", getDashboardStats);

router.get("/admins", listAdmins);
router.post("/admins", createAdmin);
router.put("/admins/:id", ownerOnly, updateAdmin);
router.delete("/admins/:id", ownerOnly, deleteAdmin);
router.get("/logs", ownerOnly, listAuditLogs);

router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

module.exports = router;
