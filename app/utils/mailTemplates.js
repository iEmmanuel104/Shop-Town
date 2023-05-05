const sendEmail = require('../utils/email.service');    
let options = {};

const sendWhatsappMessage = async (phone, message) => {
    options.phone = phone;
    options.message = message;
    await sendEmail(options);
};


const sendverificationEmail = async (email, code) => {
    console.log(code)
    options.email = email;
    options.subject = 'Email Verification';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;    
    await sendEmail(options);
};

const sendForgotPasswordEmail = async (email, code) => {
    console.log(code)
    options.email = email;
    options.subject = 'Forgot Password';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;
    await sendEmail(options);
};

module.exports = {sendverificationEmail, sendForgotPasswordEmail}