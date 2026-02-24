const express = require("express");
const {
  listProducts,
  listProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, adminOrOwnerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listProducts);
router.get("/categories", listProductCategories);
router.get("/:id", getProductById);
router.post("/", protect, adminOrOwnerOnly, createProduct);
router.put("/:id", protect, adminOrOwnerOnly, updateProduct);
router.delete("/:id", protect, adminOrOwnerOnly, deleteProduct);

module.exports = router;
