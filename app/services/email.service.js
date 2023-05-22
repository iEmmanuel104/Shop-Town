require('dotenv').config();
const sendGridMail = require('@sendgrid/mail')
const CustomError =  require('../utils/customErrors')
const nodemailer = require("nodemailer") 
const { SENDGRID_API_KEY, EMAIL_HOST_ADDRESS, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN, OAUTH_ACCESS_TOKEN } = require('../utils/configs')

const createSendGridEmail = () => {
    sendGridMail.setApiKey(SENDGRID_API_KEY)

    const sendEmail = async (options) => {
        const mailOptions = {
            // from: options.from ? options.from : `Royalti.io <${EMAIL_HOST_ADDRESS}>`,
            from: options.from ? options.from : 'KLICK <hello@EZcart.com>',
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html ? options.html : `<html><body>${options.message}</body></html>`,
            attachments: options.attachments ? options.attachments : [],
        }

        await sendGridMail
            .send(mailOptions)
            .then((response) => {
                console.log(response[0].statusCode, 'statusCode')
                console.log(response[0].headers, 'headers')
            })
            .catch((error) => {
                console.error('Error sending test email')
                console.error(error)
                if (error.response) {
                    console.error(error.response.body)
                }
            })
    }
    return sendEmail
}

const createNodemailerEmail = () => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            type: "OAuth2",
            user: EMAIL_HOST_ADDRESS,
            clientId: OAUTH_CLIENT_ID,
            clientSecret: OAUTH_CLIENT_SECRET,
            refreshToken: OAUTH_REFRESH_TOKEN,
            accessToken: OAUTH_ACCESS_TOKEN,
        },
    })
    const sendEmail = async (options) => {
        console.log("mail options:", options)
        const mailOptions = {
            from: options.from ? options.from : `KLICK <${EMAIL_HOST_ADDRESS}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html ? options.html : `<html><body>${options.message}</body></html>`,
            attachments: options.attachments
        }

        try {
            await transporter.sendMail(mailOptions)
            console.log(`Email sent to ${options.email}`)
        } catch (error) {
            console.error(`Error sending email to ${options.email}: ${error}`)
            throw new CustomError.InternalServerError('Error sending email')
        }
    }
    return sendEmail
}

let sendEmail
if (process.env === 'production') {
    sendEmail = createSendGridEmail()
}
else {
    sendEmail = createNodemailerEmail()
}

module.exports = sendEmail
// ru ? LA *% t0No : qO$#