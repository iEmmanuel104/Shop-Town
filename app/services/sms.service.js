const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = require('../utils/configs')
const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
console.log("accountSid:", accountSid)  
const client = require('twilio')(accountSid, authToken);

const sendSMS = async (options) => {
    console.log("sms options:", options)
    await client.messages
    .create({
        from: 'whatsapp:+14155238886',
        body: options.message,
        to: `whatsapp:${options.phone}`
    })
    .then(message => console.log(message.sid, "whatsapp message sent"));
}

// sendSms({phone: '+2348062144727', message: 'Hello world FROM EMMANUEL'})

module.exports = sendSMS;