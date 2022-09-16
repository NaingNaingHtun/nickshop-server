const express = require("express");
const app = express();
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
const authRoute = require("./Routes/auth");
const userRoute = require("./Routes/user");
const productRoute = require("./Routes/product");
const orderRoute = require("./Routes/order");
const cartRoute = require("./Routes/cart");
const emailsRoute = require("./Routes/emails");
//load the system environment variables
dotenv.config();
//variables declarations
const PORT = process.env.PORT;
// const MONGODB_URL = process.env.MONGODB_URL;
const uri = process.env.MONGODB_URI;
//connecting to the database
mongoose.connect(uri).then(() => {
  console.log("Connected to MongoDB Database");
});

//middlware functions
app.use(cors()); //CORS enabled
app.use(express.json()); //parsing the body
app.use("/api/auth", authRoute); //auth route
app.use("/api/users", userRoute); //user route
app.use("/api/products", productRoute); //user route
app.use("/api/orders", orderRoute); //user route
app.use("/api/cart", cartRoute); //user route
app.use("/api/emails", emailsRoute); //user route
//server listen
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}.`);
});

app.get("/", (req, res) => {
  res.status(200).json("Welcome to Nick Shop Ecommerce Server");
});
