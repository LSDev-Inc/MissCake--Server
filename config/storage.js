const path = require("path");

const defaultUploadsDir = path.join(__dirname, "..", "uploads");
const uploadsDir = path.resolve(process.env.UPLOAD_DIR || defaultUploadsDir);

module.exports = {
  uploadsDir,
};
