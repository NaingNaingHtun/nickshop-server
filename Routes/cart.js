const router = require("express").Router();
const Cart = require("../Models/Cart");
const {
  verifyToken,
  authorizeUser,
  verifyAdmin,
} = require("./userVerification");

//===============ROUTES HANDLING============
//create a cart
router.post("/", verifyToken, async (req, res) => {
  try {
    //make a new cart
    const newCart = new Cart(req.body);
    //save the new cart
    const savedCart = await newCart.save();
    res.status(200).json(savedCart);
  } catch (error) {
    res.status(500).json(error);
  }
});
//get cart
router.get("/find/:id", async (req, res) => {
  //only admin can get the product
  try {
    const cart = await Cart.findById(req.params.id);
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json(error);
  }
});
//update cart
router.put("/:id", verifyToken, authorizeUser, async (req, res) => {
  try {
    const updatedCart = await Cart.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedCart);
  } catch (error) {
    res.status(500).json(error);
  }
});
//delete cart
router.delete("/:id", verifyToken, authorizeUser, async (req, res) => {
  //only user can delete its own cart
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.status(200).json("Cart has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});
//get all the carts
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can get the carts
  try {
    const carts = await Cart.find();
    res.status(200).json(carts);
  } catch (error) {
    res.status(500).json(error);
  }
});
module.exports = router;
