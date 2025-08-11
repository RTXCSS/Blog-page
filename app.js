require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieparser = require("cookie-parser");
const mongoose = require("mongoose");
const { Blog } = require("./models/blog");
const { checkauthcookie } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 8000;

const userRoute = require("./routes/user");
const blogroute = require("./routes/blog");

// Validate envs
if (!process.env.MONGO_URL) {
throw new Error("MONGO_URL is not set in .env");
}

// Connect Mongo
mongoose
.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB connected"))
.catch((err) => {
console.error("MongoDB connection error:", err.message);
process.exit(1);
});

app.use(express.urlencoded({ extended: false }));
app.use(cookieparser());
app.use(checkauthcookie("token"));

// Serve static images from ./images at /
app.use(express.static(path.resolve("./images")));

app.use((req, res, next) => {
res.locals.user = req.user || null;
next();
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use("/user", userRoute);
app.use("/blog", blogroute);

app.get("/", async (req, res) => {
const allblog = await Blog.find({}).populate("createdBy", "fullName pfp");
res.render("home", {
user: req.user,
blogs: allblog,
});
});

app.get("/logout", (req, res) => {
res.clearCookie("token").redirect("/");
});

app.listen(PORT, () => {
console.log(`Server has been started on Port ${PORT}`);
});