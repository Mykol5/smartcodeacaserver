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

// Function to send a verification email
async function sendVerificationEmail(email, verificationCode) {
  try {
    // Define email options for verification email
    const mailOptions = {
      from: 'smarttechhubinc@gmail.com',
      to: email,
      subject: 'Email Verification Code',
      text: `Your verification code is: ${verificationCode}`,
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
