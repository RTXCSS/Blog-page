const { validatetoken } = require("../services/auth");

function checkauthcookie(cookieName) {
  return (req, res, next) => {
    const token = req.cookies[cookieName];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const payload = validatetoken(token);
      req.user = payload;
    } catch (error) {
      req.user = null;
    }
    return next();
  };
}

module.exports = { checkauthcookie };
