require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { validatetoken } = require("./services/auth"); 


const { Blog } = require("./models/blog");
const { checkauthcookie } = require("./middleware/auth");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");

const app = express();
const PORT = process.env.PORT || 9231;
//cors
const allowedOrigins = [
  "http://localhost:5173",           // React dev
  "https://your-frontend-domain.com" // Production frontend
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

/* -------------------- VALIDATE ENV -------------------- */
if (!process.env.MONGO_URL) {
  throw new Error("MONGO_URL is not set in .env");
}

/* -------------------- MONGO -------------------- */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(checkauthcookie("token"));

/* -------------------- STATIC & VIEWS -------------------- */
app.use(express.static(path.resolve("./images")));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

/* -------------------- ROUTES -------------------- */
app.use("/user", userRoute);
app.use("/blog", blogRoute);

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

/* -------------------- SOCKET.IO -------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const cookieHeader = socket.request.headers.cookie;
    if (!cookieHeader) return next();

    const token = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) return next();

    const user = validatetoken(token);
    socket.user = user;

    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next();
  }
});


io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("send-message", (text) => {
    io.emit("receive-message", {
      text,
      user: socket.user?.fullName || "Guest",
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});