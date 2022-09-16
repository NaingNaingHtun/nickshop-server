const router = require("express").Router();
const User = require("../Models/User");
const cryptoJs = require("crypto-js");
const JWT = require("jsonwebtoken");
//REGISTER
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, phone, age, address, password } =
    req.body;
  const user = await User.find({ email });
  if (user.length > 0) {
    //check if the user is already registered
    res.status(401).json("Email Already Registered");
  } else {
    //if the user is not already registered, then register them
    const newUser = new User({
      username: firstName + " " + lastName,
      email,
      password: cryptoJs.AES.encrypt(
        password,
        process.env.PASS_SECRET_KEY
      ).toString(),
      age,
      phone,
      address,
    });
    await newUser
      .save()
      .then((savedUser) => {
        const { password: p, ...others } = savedUser._doc;
        res.status(201).json(others);
      }) //success creation
      .catch((err) => res.status(500).json(err)); //saved the new user
  }
});
//LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      //if the user is not found with email address
      return res.status(401).json("Incorrect email or password");
    }
    //password matching stage
    const originalPassword = cryptoJs.AES.decrypt(
      user.password,
      process.env.PASS_SECRET_KEY
    ).toString(cryptoJs.enc.Utf8);
    //handling password incorrect
    if (password !== originalPassword) {
      return res.status(401).json("Incorrect email or password");
    }
    //create access token
    const accessToken = JWT.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "30d",
      }
    );
    //handling password correct
    const { password: userPassword, ...others } = user._doc;
    res.status(200).json({ ...others, accessToken });
  } catch (err) {
    res.status(500).json(err);
  }
});

//validating the access token
router.post("/validate", async (req, res) => {
  //we are going to check if the _id which is user's id is equal to the id of the access token
  //if it is validated, then it means it is the valid user
  const { _id, accessToken } = req.body;
  try {
    const { id } = JWT.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (id === _id) {
      res.status(200).json("valid token");
    }
  } catch (err) {
    res.status(401).json("Invalid Token");
  }
});

//validating whether it is the admin or not
router.post("/validateAdmin", async (req, res) => {
  const { _id, token } = req.body;
  const user = await User.findById(_id);
  if (!user) {
    //no user with that id, then it is unauthorized user
    res.status(401).json("Unauthorized User");
    return;
  }

  try {
    const { id } = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (id === _id && user.isAdmin) {
      res.status(200).json("Valid user and it is admin");
    } else {
      res.status(401).json("Unauthorized User");
    }
  } catch (err) {
    res.status(401).json("Unauthorized User");
  }
});

module.exports = router;
