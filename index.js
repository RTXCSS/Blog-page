const express = require("express");
const path = require("path");
const cookieparser = require("cookie-parser");


const app = express();
const PORT = 8000;


const userRoute = require("./routes/user");


const mongoose = require("mongoose");
const { checkauthcookie } = require("./middleware/auth");
mongoose.connect('mongodb://localhost:27017/bloger')
.then((e)=>console.log("MongoDB connected"));

app.use(express.urlencoded({extended:false}));
app.use(cookieparser());
app.use(checkauthcookie("token"));
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));


app.use("/user",userRoute);


app.get("/",(req,res)=>{
    res.render("home",{
        user : req.user,
    });
});


app.listen(PORT,()=>{
    console.log(`Server has been started on Port ${PORT}`)
})