// emailSender.js

const nodemailer = require('nodemailer');

// Create a transporter object using your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., 'Gmail', 'Outlook', etc.
  auth: {
    user: 'smarttechhubinc@gmail.com',
    pass: 'ryiqzfanjljtzyam',
  },
});

// Function to send a verification email with styled HTML content
async function sendVerificationEmail(email, verificationCode) {
  try {
    // Define email options for verification email
    const mailOptions = {
      from: 'smarttechhubinc@gmail.com',
      to: email,
      subject: 'Email Verification Code',
      html: `<html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f2f2f2;
              margin: 0;
              padding: 0;
            }
            .container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #f2f2f2;
            }
            .verification-form {
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
              padding: 20px;
              text-align: center;
              max-width: 400px;
              width: 100%;
              margin: 0 auto;
            }
            .form-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .message {
              font-size: 16px;
              color: #555;
              margin-bottom: 20px;
            }
            .code {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="verification-form">
              <h1 class="form-title">Smart Tech Hub Email Verification</h1>
              <p class="message">Thank you for signing up with Smart Tech Hub. To complete your registration, please enter the following verification code:</p>
              <p class="message">Verification Code: <span class="code">${verificationCode}</span></p>
              <p class="message">If you did not request this verification code, please ignore this email.</p>
              <p class="message">Once you have verified your email, you will have full access to your account and our services.</p>
              <p class="message">Verify your email now by clicking the link below:</p>
              <a href="https://smartcodeacademy.netlify.app/email-verification.html?email=${email}" style="text-decoration: none;">
                <button style="background-color: #007bff; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;">
                  Verify Email
                </button>
              </a>
              <p class="message">Best regards,<br>The Smart Tech Hub Team</p>
            </div>
          </div>
        </body>
      </html>`,
    };

    // Send the verification email
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent.');
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
}



// Function to send a user ID email and notify admin
async function sendUserIdEmailAndNotifyAdmin(email, userId, firstName, lastName) {
  try {
    // Define email options for user ID email
    const userMailOptions = {
      from: 'smarttechhubinc@gmail.com',
      to: email,
      subject: 'Your User ID',
      html: `
        <p>Hello!</p>
        <p>Thank you for verifying your email and joining Smart Tech Hub Inc. Your User ID is: ${userId}</p>
        <p>You can use this User ID to log in to your account.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>Smart Tech Hub Team</p>
      `,
    };

    // Define email options for admin notification email
    const adminMailOptions = {
      from: 'smarttechhubinc@gmail.com',
      to: 'smarttechhubinc@gmail.com', // Replace with your admin's email
      subject: 'New User Registration',
      html: `
        <p>New user registered:</p>
        <p>User ID: ${userId}</p>
        <p>Name: ${firstName} ${lastName}</p>
        <p>Email: ${email}</p>
      `,
    };

    // Send both the user ID email and the admin notification email
    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    console.log('User ID email sent.');
    console.log('Admin notification email sent.');
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}


module.exports = { sendVerificationEmail, sendUserIdEmailAndNotifyAdmin };
