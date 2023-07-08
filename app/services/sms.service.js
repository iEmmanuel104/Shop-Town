const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_SERVICE_SID } = require('../utils/configs')
const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const {BadRequestError, NotFoundError, ForbiddenError} = require('../utils/customErrors');

const sendWhatsappSMS = async (options) => {
    console.log("sms options:", options)
    await client.messages
    .create({
        from: 'whatsapp:+14155238886',
        body: options.message,
        to: `whatsapp:${options.phone}`
    })
    .then(message => console.log(message.sid, "Whatsapp message sent"));
}

const sendPhoneSMS = async (options) => {
    console.log("send phone verificatiion:", options)
    await client.verify.v2.services(TWILIO_PHONE_SERVICE_SID)
    .verifications
    .create({to: `+${options.phone}`, channel: 'sms'})
    .then(verification => console.log(verification.status));
}

const verifyCode = async (options) => {
    console.log("verify phone:", options)
    await client.verify.v2.services(TWILIO_PHONE_SERVICE_SID)
    .verificationChecks
    .create({to: `+${options.phone}`, code: options.code})
    .then(verification_check => console.log(verification_check.status));
}

const phoneNumberLookup = (options) => {
    return new Promise((resolve, reject) => {
        console.log("verify phone:", options);
        client.lookups.v1.phoneNumbers(`+${options.phone}`)
            .fetch({ type: ['carrier'] })
            .then((phone_number) => {
                // console.log(phone_number);
                resolve(phone_number);
            })
            .catch((error) => {
                // console.log("Error occurred:", error);
                reject(new BadRequestError('Invalid phone number'));
            });
    });
};




// sendSms({phone: '+2348062144727', message: 'Hello world FROM EMMANUEL'})

module.exports = {
    sendWhatsappSMS,
    sendPhoneSMS,
    verifyCode,
    phoneNumberLookup
}