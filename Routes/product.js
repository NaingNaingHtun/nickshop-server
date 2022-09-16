const router = require("express").Router();
const { Product } = require("../Models/Product");
const { verifyToken, verifyAdmin } = require("./userVerification");

//===============ROUTES HANDLING============
//create a product
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(200).json(savedProduct);
  } catch (error) {
    res.status(500).json(error);
  }
});

//update product
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  // console.log(req.params.id);
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body.content,
      },
      { new: true }
    );
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json(error);
  }
});

//getting categories for the search bar
router.get("/search/titles", async (req, res) => {
  const title = req.query.title;
  try {
    let titles = [];
    if (title) {
      titles = await Product.find({
        $or: [
          { title: { $regex: title + "", $options: "i" } },
          { category: { $in: [title] } },
        ],
      }).select({ title: 1, _id: 0 });
      res.status(200).json(titles);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});
//get product
router.get("/find/:id", async (req, res) => {
  //only admin can get the product
  try {
    const product = await Product.findById(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json(error);
  }
});
//delete product
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can delete the product
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json("Product has been deleteded successfully");
  } catch (error) {
    res.status(500).json(error);
  }
});

//get all the products
router.get("/", async (req, res) => {
  const query = req.query;
  let result = [];
  let queryObj = {};
  //query making stages
  if (Object.keys(query).length === 0) {
    res.status(200).json(await Product.find({}));
  } else {
    if (query.title) {
      queryObj = {
        $or: [
          { title: { $regex: query.title + "", $options: "i" } },
          { category: query.title },
          { for: query.title },
        ],
        ...queryObj,
      };
    }
    if (query.category) {
      queryObj = { category: query.category, ...queryObj };
    }
    if (query.size) {
      queryObj = { sizes: query.size, ...queryObj };
    }

    if (query.for) {
      queryObj = { for: query.for, ...queryObj };
    }

    //sorting stages
    if (query.sorting === "newest" && Object.keys(query).length === 1) {
      //if we only have sorting query in query object that means that user hasn't filtered anything
      //in that case, we need to return all the newest products by category
      const find2ProductsByCategory = async (category) => {
        const products = await Product.find({
          category,
        })
          .sort({ createdAt: -1 })
          .limit(2);

        return products;
      };

      const hat = await find2ProductsByCategory("hat");
      const glasses = await find2ProductsByCategory("glasses");
      const coat = await find2ProductsByCategory("coat");
      const shirt = await find2ProductsByCategory("shirt");
      const pant = await find2ProductsByCategory("pant");
      const shoes = await find2ProductsByCategory("shoes");
      result.push(...hat, ...glasses, ...coat, ...shirt, ...pant, ...shoes);
      result = result.sort(() => Math.random() - 0.5); //shuffle the array
    }

    if (query.sorting === "newest" && Object.keys(query).length > 1) {
      //if we have sorting query and other queries in query object which means that user has already filtered
      result = await Product.find(queryObj);
    }

    //price ascending
    if (query.sorting === "asc") {
      result = await Product.find(queryObj).sort({ price: 1 });
    }

    //price descending
    if (query.sorting === "desc") {
      result = await Product.find(queryObj).sort({ price: -1 });
    }
    res.status(200).json(result);
  }
});
module.exports = router;
