const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'libroflow8@gmail.com',
    pass: process.env.EMAIL_PASS || 'rkwvnraapvhezena'
  }
});

module.exports = transporter;