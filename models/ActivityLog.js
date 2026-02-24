const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["admin", "category", "product", "order"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
