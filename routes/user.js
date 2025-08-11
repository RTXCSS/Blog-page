const { Router } = require("express");
const User = require("../models/user");

const router = Router();

router.get("/signin", (req, res) => {
  return res.render("signin");
});

router.get("/signup", (req, res) => {
  return res.render("signup");
});
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await User.Matchpassword(email, password);
    return res.cookie("token",token).redirect("/");
  } catch (error) {
    return res.render("signin",{
      error:"Incorrect Email or Password"
    });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    await User.create({ fullName, email, password });

    return res.redirect("/");
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(400).send("Signup error: " + error.message);
  }
});

module.exports = router;
