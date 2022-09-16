const { verify } = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    //if no token exist
    return res.status(401).json("Unauthenticated users");
  } else {
    //authorization header exist, then extract the access token
    const accessToken = authHeader.split(" ")[1];
    //token exist, then valid it
    verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
      if (error) {
        return res.status(403).json("Invalid Access Token");
      }
      //if valid access token, then pass the user to the next middleware function
      req.user = user;
      next();
    }); //here user will be {id, isAdmin}
  }
};

const authorizeUser = (req, res, next) => {
  if (req.user.id === req.params.id || req.user.isAdmin) {
    next(); //called the next middleware
  } else {
    //not the authorized user
    res.status(403).json("You are not an authorized user");
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.isAdmin) {
    next();
  } else {
    res.status(401).json("You are not an admin");
  }
};
module.exports = { verifyToken, authorizeUser, verifyAdmin };
