require('dotenv').config();
const sendGridMail = require('@sendgrid/mail')
const CustomError =  require('./customErrors')
const nodemailer = require("nodemailer"), 
config = process.env

const createSendGridEmail = () => {
    sendGridMail.setApiKey(config.SENDGRID_API_KEY)

    const sendEmail = async (options) => {
        const mailOptions = {
            // from: options.from ? options.from : `Royalti.io <${config.EMAIL_HOST_ADDRESS}>`,
            from: options.from ? options.from : 'EZcart <hello@EZcart.com>',
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
            user: config.EMAIL_HOST_ADDRESS,
            clientId: config.OAUTH_CLIENT_ID,
            clientSecret: config.OAUTH_CLIENT_SECRET,
            refreshToken: config.OAUTH_REFRESH_TOKEN,
            accessToken: config.OAUTH_ACCESS_TOKEN,
        },
    })
    const sendEmail = async (options) => {
        const mailOptions = {
            from: options.from ? options.from : `EZCART <${config.EMAIL_HOST_ADDRESS}>`,
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
if (env === 'production') {
    sendEmail = createSendGridEmail()
}
else {
    sendEmail = createNodemailerEmail()
}

export default sendEmail
// ru ? LA *% t0No : qO$#