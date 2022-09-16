const emails = require("express").Router();
const Email = require("../Models/Email");
//add an email
emails.post("/", async (req, res) => {
  const { email } = req.body;
  try {
    const newEmail = new Email({ email });
    await newEmail.save({ email });
    res.status(200).json("Addded the the subscriptions");
  } catch (err) {
    console.log(err);
    res.status(500).json("Error While Saving the Email Address");
  }
});

module.exports = emails;
