import dotenv from 'dotenv'
dotenv.config()

const env = process.env.NODE_ENV
import sendGridMail from '@sendgrid/mail'
import nodemailer from "nodemailer"
import CustomError from './customErrors'
const config = process.env

type EmailOptions = {
    from?: string
    email: string
    subject: string
    message: string
    html?: string
    attachments?: any
}

type SendEmailFunction = (options: EmailOptions) => Promise<void | Error>

const createSendGridEmail = (): SendEmailFunction => {
    sendGridMail.setApiKey(config.SENDGRID_API_KEY!)

    const sendEmail: SendEmailFunction = async (options) => {
        const mailOptions = {
            // from: options.from ? options.from : `Royalti.io <${config.EMAIL_HOST_ADDRESS}>`,
            from: options.from ? options.from : 'Royalti.io <hello@royalti.io>',
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html ? options.html : undefined,
            attachments: options.attachments ? options.attachments : [],
        }

        await sendGridMail
            .send(mailOptions)
            .then((response: any) => {
                console.log(response[0].statusCode, 'statusCode')
                console.log(response[0].headers, 'headers')
            })
            .catch((error: any) => {
                console.error('Error sending test email')
                console.error(error)
                if (error.response) {
                    console.error(error.response.body)
                }
            })
    }
    return sendEmail
}

const createNodemailerEmail = (): SendEmailFunction => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            type: "OAuth2",
            user: config.EMAIL_HOST_ADDRESS!,
            clientId: config.OAUTH_CLIENT_ID!,
            clientSecret: config.OAUTH_CLIENT_SECRET!,
            refreshToken: config.OAUTH_REFRESH_TOKEN!,
            accessToken: config.OAUTH_ACCESS_TOKEN!,
        },
    })    
    const sendEmail: SendEmailFunction = async (options) => {
        const mailOptions = {
            from: options.from ? options.from : `Royalti.io <${config.EMAIL_HOST_ADDRESS}>`,
            to: options.email,
            subject: options.subject,
            // text: options.message,
            html: options.html ? options.html : undefined,
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

let sendEmail: SendEmailFunction
if (env === 'production') {
    sendEmail = createSendGridEmail()
} 
else {
    sendEmail = createNodemailerEmail()
}

export default sendEmail
// ru ? LA *% t0No : qO$#