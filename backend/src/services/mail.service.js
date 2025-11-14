import nodemailer from 'nodemailer';

const transportOptions = {
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: process.env.MAIL_USER
    ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    : undefined
};

let transporter = null;

const getTransporter = () => {
  if (!process.env.MAIL_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport(transportOptions);
  }
  return transporter;
};

const sendMail = async ({ to, subject, text }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.info('[mail] skipped email', { to, subject, text });
    return;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text
  });
};

export const sendRegistrationEmail = async (user) =>
  sendMail({
    to: user.email,
    subject: 'Welcome to AuctionApp',
    text: `Hello ${user.fullName || user.email},\n\nThanks for registering!`
  });

export const sendPasswordResetEmail = async ({ email, token }) =>
  sendMail({
    to: email,
    subject: 'Reset your AuctionApp password',
    text: `To reset your password, use this token: ${token}`
  });

export const sendBidNotification = async ({ email, productName, amount }) =>
  sendMail({
    to: email,
    subject: 'New bid received',
    text: `New bid on ${productName}: ${amount}`
  });

export const sendOrderNotification = async ({ email, productName, status }) =>
  sendMail({
    to: email,
    subject: 'Order update',
    text: `Order for ${productName} is now ${status}`
  });

export const sendQuestionNotification = async ({ email, productName, questionText }) =>
  sendMail({
    to: email,
    subject: 'New question on your product',
    text: `New question on ${productName}: ${questionText}`
  });

export const sendAnswerNotification = async ({ email, productName, answerText }) =>
  sendMail({
    to: email,
    subject: 'Your question has been answered',
    text: `Answer on ${productName}: ${answerText}`
  });
