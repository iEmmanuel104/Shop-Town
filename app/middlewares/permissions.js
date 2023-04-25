const jwt = require("jsonwebtoken");
module.exports  = function (roles) {
    return function (req, res, next) {
        try {
            const allowed_user = roles.split(" ");
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Access denied" });
            }
            const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_JWT_SECRET);
                console.log('auhorisation passed');
                // const decoded = jwt.verify(token, "secret2");
                if (!allowed_user.includes(decoded.role)) {
                    return res.status(403).json({ message: "Unauthorised Access" });
                }
                next();
        } catch (error) {
            res.status(400).send(error.message);
        }
    };
};