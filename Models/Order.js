const mongoose = require("mongoose");
const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String },
    products: { type: Array, default: [] },
    total: { type: Number, required: true },
    address: { type: String, required: true },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Order", OrderSchema);
