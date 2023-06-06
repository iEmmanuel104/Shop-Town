import sendEmail from "./email";
import config from "./config";
const logo ="https://storage.googleapis.com/royalti-uploads-public/logo%20(3).png"

import fs from 'fs';
import path from 'path';
// get html file


const htmltemp = (message: string) => {
    return `
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email template</title>
    <style>
           .container {
            width: 100%;
            height: 100%;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .content-wrapper {
            width: 100%;
            margin: 0 auto;
            padding: 10px;
        }

        .card {
            width: 100%;
            padding: 8px;
            border: 1px solid #E5E7EB;
            border-radius: 0.375rem;
            background-color: #F3F4F5;
        }

        .logo {
            height: 2.5rem;
            width: 2.5rem;
        }

        .title {
            margin-bottom: 0.625rem;
            margin-top: 2rem;
            font-size: 1.5rem;
        }

        .content {
            padding: 0.75rem;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            color: #888888;
            border-radius: 0.375rem;
            font-size: 0.875rem;
        }

        .content p:first-child {
            margin-bottom: 0.875rem;
        }

        .card .content a {
            background-color: #006666;
            margin-top: 0.625rem;
            padding: 0.375rem 0.5rem;
            border-radius: 0.375rem;
            margin-top: 0.625rem;
            padding-top: 0.375rem;
            padding-bottom: 0.375rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            border-radius: 0.375rem;
            color: #FFFFFF;
            font-size: 0.75rem;
            text-decoration: none;
            cursor: auto;
        }

        .separator {
            height: 1px;
            margin-top: 2rem;
            margin-bottom: 2rem;
            background-color: #E5E7EB;
            border: none;
        }

        .footer {
            margin-bottom: 1.25rem;
            color: #888888;
            font-size: 0.75rem;
            text-align: center;
        }

        .footer img {
            height: 1.25rem;
            width: 1.25rem;
        }

        .footer p:first-child {
            margin-bottom: 0.375rem;
        }
   </style>
</head>
<body>
    <div class="container">
        <div class="container-wrapper">
          <div class="card">
            <div>
              <img class="logo" src= ${logo} />
            </div>
  
            ${message}
  
                <hr class="separator"></hr>
  
            <div class="footer">
              <img class="logo" src=${logo} /> &nbsp;
              <p">Sent with love from royalti.io</p>
              <p>If you are having issues clicking the get started button, copy and
                paste the URL below in your web browser.
                https://royalti.io/get_started
              </p>
              <p>(c) 2020 Palm Media . All Rights Reserveed</p>
            </div>
          </div>
        </div>
      </div>
</body>`}


const sendactivationEmailAdmin = async (email: string, activationCode: string, link: string) => {
    const message = `
                   <div class="title">
              Kindly Activate your account
            </div>

            <div class="content">
              <p>Hello,</p>

              <p>Thank you for signing up.</p>

              <p>Please click the button below to activate your account.</p>
              
                <a href="${link} class="button" >Activate Account </a>
             
            </div>`;
    const html = htmltemp(message);
    const subject = "Account Verification for new Super Admin";
    return await sendEmail({ email, message, subject, html });
};

const accountactivationEmail = async (email: string, activationCode: string, link: string) => {
    const message = `
                <div class="title">
              Kindly Activate your account
            </div>

            <div class="content">
              <p>Hello,</p>

              <p class="my-7">Thank you for signing up.</p>

              <p>Please click the button below to activate your account.</p>

                        <a href="${link} class="button" >Activate Account </a>
            </div>
  `;
    const subject = "Activate your Royalti.io account";
    const html = htmltemp(message);                         
    return await sendEmail({ email, message, subject, html });
};



const accountverificationEmail = async (email: string, verificationCode: string, link: string) => {
    const message = `
            <div class="title">
              Kindly Activate your account
            </div>

            <div class="content">
              <p>Hello,</p>

              <p class="my-7">Thank you for signing up.</p>

              <p>Please click the button below to activate your account.</p>
                <a href="${link} class="button" >Activate Account </a>
             
            </div>
  `;
    const html = htmltemp(message);
    const subject = "Verify your Royalti.io account";
    return await sendEmail({ email, message, subject, html });
};

const passwordresetEmail = async (email: string, link: string) => {
    const message = `            
    <div class="title">
              There was a request to reset your password, if you did not make this
                request, please ignore this email.
            </div>
  
            <div class="content">
  
              <p>Please click the button below to reset your password.</p>
            
                <a href="${link} class="button" >Reset Password </a>
             
            </div> 
    `;
    const html = htmltemp(message);
    const subject = "Password Reset";
    return await sendEmail({ email, message, subject, html });
};

const sendattachmentEmail = async (email: string, attachment: any, type: string) => {
    const message = `.
          <div class="title">
                ${type} Data infromation attached
            </div>

            <div class="content">
              <p>Hello,</p>

              <p class="my-7"> Find attached to this mail ${type} data information.</p>
             
            </div>`;
    const html = htmltemp(message);
    const subject = "User Information Data";
    const attachments = attachment;
    return await sendEmail({ email, message, subject, html, attachments });
};




export default {
    sendactivationEmailAdmin,
    accountactivationEmail,
    accountverificationEmail,
    passwordresetEmail,
    sendattachmentEmail
};