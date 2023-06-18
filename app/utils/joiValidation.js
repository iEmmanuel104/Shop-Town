const Joi = require('joi');


const userSchema = Joi.object({
    id: Joi.string().uuid().required(),
    firstName: Joi.string().trim().required(),
    lastName: Joi.string().trim().required(),
    email: Joi.string().trim().email().required(),
    role: Joi.string().valid("super_admin", "admin", "vendor", "guest").required(),
    address: Joi.string().trim(),
    phone: Joi.string().trim().length(10, 15).pattern(/^[0-9]+$/),
    status: Joi.string().valid("ACTIVE", "INACTIVE").required(),
    terms: Joi.string().valid("on", "off"),
    googleId: Joi.string().allow(null),
    facebookId: Joi.string().allow(null),
    vendorMode: Joi.boolean().required(),
    isActivated: Joi.boolean().required(),
    profileImage: Joi.string()
});
