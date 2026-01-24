const { Schema, model } = require("mongoose");

const blogschema = new Schema({
    title:{
        type:String,
        required:true,
    },
    body:{
        type:String,
        required:true,
    },
    coverimage:{
        type:String,
        required:false,
    },
    createdBy:{
        type:Schema.Types.ObjectId,
        ref:"User",
    }
},{timestamps:true});


const  Blog = model("blog",blogschema);

module.exports ={
    Blog,
}

