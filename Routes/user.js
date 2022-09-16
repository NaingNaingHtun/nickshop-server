const {
  authorizeUser,
  verifyToken,
  verifyAdmin,
} = require("./userVerification");
const cryptoJs = require("crypto-js");
const router = require("express").Router();
const User = require("../Models/User");
//update the user information
router.put("/:id", verifyToken, authorizeUser, async (req, res) => {
  const { firstName, lastName, email, oldPassword, newPassword } = req.body;
  // console.log(oldPassword, newPassword);
  const updatingUser = {};
  const user = await User.findById(req.params.id);
  // console.log("user:>", user);
  if (firstName && lastName) {
    //if the user is going to updat the username
    updatingUser.username = firstName + " " + lastName;
  }
  if (email) {
    //if the user is going to update the email
    updatingUser.email = email;
  }
  if (newPassword) {
    //if the user is going to update the password, he must enter the old password correctly
    const decryptedOldPassword = cryptoJs.AES.decrypt(
      user.password,
      process.env.PASS_SECRET_KEY
    ).toString(cryptoJs.enc.Utf8);
    if (oldPassword === decryptedOldPassword) {
      //old password is correct
      const newEncryptedPassword = cryptoJs.AES.encrypt(
        newPassword,
        process.env.PASS_SECRET_KEY
      ).toString();

      updatingUser.password = newEncryptedPassword;
    } else {
      res.status(401).send({ message: "Password is incorrect" });
      return;
    }
  }

  //update the user information
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: updatingUser,
      },
      { new: true }
    );
    res.status(200).json(updatedUser);
    console.log(updatedUser);
  } catch (error) {
    res.status(500).json(error); //internal server error
  }
});
//get user
router.get("/find/:id", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can get the users
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (error) {
    res.status(500).json(error);
  }
});
//delete user
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can delete the users
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});
//get all the users
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can get the users
  const onlyLatestUsers = req.query.new;
  try {
    const users = onlyLatestUsers
      ? await User.find().sort({ createdAt: -1 }).limit(5)
      : await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(error);
  }
});
//get user stats per month
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can see the users stats
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));
  try {
    const data = await User.aggregate([
      { $match: { createdAt: { $gte: lastYear } } }, //filter stage
      {
        $project: {
          month: { $month: "$createdAt" },
        },
      }, //projecting stage, alos making a new document
      {
        $group: {
          //grouping stage
          _id: "$month",
          total: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});
module.exports = router;
