const sendEmail = require('../services/email.service');
const { sendWhatsappSMS, verifyCode, sendPhoneSMS } = require('../services/sms.service');
const { sendPushNotification } = require('../services/firebase.service');
const options = {};
const { SUPER_ADMIN_EMAIL } = require('../utils/configs');

const sendWhatsappMessage = async (phone, message) => {
    options.phone = phone;
    options.message = message;
    await sendEmail(options);
};

const sendVerificationEmail = async (details, code) => {
    const { email, phone } = details;
    console.log(code);
    options.email = email;
    options.subject = 'Email Verification';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;
    sendEmail(options);
    // options.phone = phone;
    // await sendPhoneSMS(options);
};

const sendForgotPasswordEmail = async (details, code) => {
    const { email, phone } = details;
    console.log(code);
    options.email = email;
    options.subject = 'Forgot Password';
    options.message = `Your verification code is ${code}`;
    // options.html = `${options.message}`;
    await sendEmail(options);
};

const orderConfirmationEmail = async (details) => {
    const { email, phone, order } = details;
    options.email = email;
    options.subject = 'Order Confirmation';
    options.message = `Your order has been confirmed.`;
    // options.html = `${options.message}`;
    await sendEmail(options);
};

const sendorderpushNotification = async (details) => {
    const { registrationToken, phone, order } = details;
    const title = 'Order Confirmation';
    const body = `New order payment has been confirmed.`;
    await sendPushNotification(registrationToken, title, body);
};

const sendShipbubblePaymentErrorEmail = async (details) => {
    const { message } = details;
    options.email = SUPER_ADMIN_EMAIL;
    options.subject = 'Shipbubble Payment Processing Error';
    options.message = `Shipbubble payment error.`;
    // options.html = `${options.message}`;
    await sendEmail(options);
};

module.exports = {
    sendVerificationEmail,
    sendForgotPasswordEmail,
    orderConfirmationEmail,
    sendorderpushNotification,
    sendShipbubblePaymentErrorEmail,
};
