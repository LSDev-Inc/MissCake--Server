const mongoose = require("mongoose");
const Stripe = require("stripe");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { logActivity } = require("../utils/activityLogger");

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");
const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const resolveClientBaseUrl = (req) => {
  const requestOrigin = normalizeOrigin(req.get("origin"));
  if (requestOrigin) {
    return requestOrigin;
  }

  const configuredOrigins = [process.env.CLIENT_URL, ...parseOrigins(process.env.CLIENT_URLS)].filter(Boolean);
  if (configuredOrigins.length > 0) {
    return normalizeOrigin(configuredOrigins[0]);
  }

  const fallbackClientPort = process.env.CLIENT_PORT || "5173";
  return `http://localhost:${fallbackClientPort}`;
};

const createCheckoutSession = async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(500);
      throw new Error("Stripe is not configured on server");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error("Cart items are required");
    }

    const productIds = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const lineItems = [];
    const orderProducts = [];
    let totalAmount = 0;

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      const quantity = Number(item.quantity || 0);

      if (!dbProduct || quantity < 1) {
        res.status(400);
        throw new Error("Invalid cart items");
      }

      const unitPrice = dbProduct.price;
      totalAmount += unitPrice * quantity;

      orderProducts.push({
        product: dbProduct._id,
        quantity,
        unitPrice,
      });

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: dbProduct.title,
            description: dbProduct.description.slice(0, 255),
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });

      if (typeof dbProduct.image === "string" && /^https?:\/\//.test(dbProduct.image)) {
        lineItems[lineItems.length - 1].price_data.product_data.images = [dbProduct.image];
      }
    }

    const order = await Order.create({
      user: req.user._id,
      products: orderProducts,
      totalAmount,
      status: "In attesa",
      remainingTime: "",
      adminComment: "",
    });

    const clientBaseUrl = resolveClientBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${clientBaseUrl}/checkout?success=true&orderId=${order._id}`,
      cancel_url: `${clientBaseUrl}/checkout?canceled=true&orderId=${order._id}`,
      metadata: {
        orderId: String(order._id),
        userId: String(req.user._id),
      },
    });

    return res.status(201).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order._id,
    });
  } catch (error) {
    return next(error);
  }
};

const listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("products.product", "title image")
      .sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    return next(error);
  }
};

const listAllOrdersForStaff = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .populate("products.product", "title image price")
      .sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    return next(error);
  }
};

const updateOrderForStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remainingTime = "", adminComment = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid order id");
    }

    const normalizedStatus = status === "Completato" ? "Concluso" : status;
    const allowedStatuses = ["In attesa", "In preparazione", "Completato", "Concluso"];
    if (!normalizedStatus || !allowedStatuses.includes(normalizedStatus)) {
      res.status(400);
      throw new Error("Invalid status");
    }

    const order = await Order.findById(id).populate("user", "username");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    order.status = normalizedStatus;
    order.remainingTime = String(remainingTime || "").trim();
    order.adminComment = String(adminComment || "").trim();
    await order.save();

    await logActivity({
      actor: req.user._id,
      action: "UPDATED_ORDER",
      targetType: "order",
      targetId: order._id,
      targetLabel: `Order ${order._id}`,
      details: `${req.user.username} updated order ${order._id} for ${order.user?.username || "user"}`,
    });

    const updatedOrder = await Order.findById(id)
      .populate("user", "username email")
      .populate("products.product", "title image price");

    return res.status(200).json({
      message: "Order updated",
      order: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
};

const cancelPendingOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid order id");
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.status !== "In attesa") {
      return res.status(200).json({ message: "Order already in progress and cannot be canceled" });
    }

    await order.deleteOne();
    return res.status(200).json({ message: "Pending order canceled" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCheckoutSession,
  listMyOrders,
  listAllOrdersForStaff,
  updateOrderForStaff,
  cancelPendingOrder,
};
