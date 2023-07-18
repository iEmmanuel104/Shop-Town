const jwt = require('jsonwebtoken');
const { secret2, secret1 } = require('./configs');
module.exports = function (roles) {
    return function (req, res, next) {
        try {
            const allowedUser = roles.split(' ');
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Access denied' });
            }
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, secret2);
            console.log('auhorisation passed');
            // const decoded = jwt.verify(token, "secret2");
            if (!allowedUser.includes(decoded.role)) {
                return res.status(403).json({ message: 'Unauthorised Access' });
            }
            next();
        } catch (error) {
            return res.status(400).send(error.message);
        }
    };
};
