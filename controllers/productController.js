const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { logActivity } = require("../utils/activityLogger");

const listProducts = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        res.status(400);
        throw new Error("Invalid category id");
      }
      filter.category = category;
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ products });
  } catch (error) {
    return next(error);
  }
};

const listProductCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.status(200).json({ categories });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    return res.status(200).json({ product });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { title, image, description, preparationTime, price, category } = req.body;

    if (!title || !image || !description || price == null || !category) {
      res.status(400);
      throw new Error("title, image, description, price and category are required");
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      res.status(400);
      throw new Error("Invalid category id");
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      res.status(404);
      throw new Error("Category not found");
    }

    const numericPrice = Number(price);
    const numericPrepTime = preparationTime == null || preparationTime === "" ? null : Number(preparationTime);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      res.status(400);
      throw new Error("Invalid price");
    }

    if (numericPrepTime !== null && (Number.isNaN(numericPrepTime) || numericPrepTime < 0)) {
      res.status(400);
      throw new Error("Invalid preparationTime");
    }

    const product = await Product.create({
      title: title.trim(),
      image: image.trim(),
      description: description.trim(),
      preparationTime: numericPrepTime,
      price: numericPrice,
      category,
    });

    const populated = await Product.findById(product._id).populate("category", "name");

    await logActivity({
      actor: req.user._id,
      action: "CREATED_PRODUCT",
      targetType: "product",
      targetId: product._id,
      targetLabel: product.title,
      details: `${req.user.username} created product ${product.title}`,
    });

    return res.status(201).json({ message: "Product created", product: populated });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    if (req.body.category && !mongoose.Types.ObjectId.isValid(req.body.category)) {
      res.status(400);
      throw new Error("Invalid category id");
    }

    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        res.status(404);
        throw new Error("Category not found");
      }
    }

    const updateData = {};
    ["title", "image", "description", "price", "preparationTime", "category"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }
    if (updateData.image) {
      updateData.image = updateData.image.trim();
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }
    if (updateData.price !== undefined) {
      const parsedPrice = Number(updateData.price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400);
        throw new Error("Invalid price");
      }
      updateData.price = parsedPrice;
    }
    if (updateData.preparationTime !== undefined) {
      if (updateData.preparationTime === "" || updateData.preparationTime == null) {
        updateData.preparationTime = null;
      } else {
        const parsedPrepTime = Number(updateData.preparationTime);
        if (Number.isNaN(parsedPrepTime) || parsedPrepTime < 0) {
          res.status(400);
          throw new Error("Invalid preparationTime");
        }
        updateData.preparationTime = parsedPrepTime;
      }
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    await logActivity({
      actor: req.user._id,
      action: "UPDATED_PRODUCT",
      targetType: "product",
      targetId: product._id,
      targetLabel: product.title,
      details: `${req.user.username} updated product ${product.title}`,
    });

    return res.status(200).json({ message: "Product updated", product });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    await logActivity({
      actor: req.user._id,
      action: "DELETED_PRODUCT",
      targetType: "product",
      targetId: product._id,
      targetLabel: product.title,
      details: `${req.user.username} deleted product ${product.title}`,
    });

    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listProducts,
  listProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
