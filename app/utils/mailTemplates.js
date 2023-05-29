const sendEmail = require('../services/email.service');
const sendSMS = require('../services/sms.service');    
let options = {};

const sendWhatsappMessage = async (phone, message) => {
    options.phone = phone;
    options.message = message;
    await sendEmail(options);
    
};


const sendverificationEmail = async (details, code) => {
    const {email, phone } = details;
    console.log(code)
    options.email = email;
    options.subject = 'Email Verification';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;    
    await sendEmail(options);
    options.phone = phone;
    await sendSMS(options);
};

const sendForgotPasswordEmail = async (details, code) => {
    const {email, phone } = details;
    console.log(code)
    options.email = email;
    options.subject = 'Forgot Password';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;
    await sendEmail(options);
};

module.exports = {sendverificationEmail, sendForgotPasswordEmail}