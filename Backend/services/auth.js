const JWT =require("jsonwebtoken");

const secret = "fu^^init96";

function createToken(user){
    const payload={
        _id : user._id,
        email : user.email,
        fullName :user.fullName,
        pfp : user.pfp,
        role : user.role,
    }
    const token = JWT.sign(payload,secret);
    return token;
}

function validatetoken(token){
    const payload = JWT.verify(token,secret);
    return payload;
}
module.exports = {
    createToken,
    validatetoken,
}
