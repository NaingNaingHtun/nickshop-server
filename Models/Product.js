const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    desc: { type: String, required: true },
    image: { type: String, required: true },
    for: { type: Array },
    category: { type: Array },
    colors: { type: Array },
    sizes: { type: Array },
    price: { type: Number },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", productSchema);
module.exports = { Product, productSchema };
