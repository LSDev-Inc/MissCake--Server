const ActivityLog = require("../models/ActivityLog");

const logActivity = async ({ actor, action, targetType, targetId, targetLabel, details = "" }) => {
  try {
    await ActivityLog.create({
      actor,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
    });
  } catch (error) {
    console.error(`Audit log failed: ${error.message}`);
  }
};

module.exports = { logActivity };
