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
  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject,
      text
    });
  } catch (err) {
    console.warn('[mail] delivery failed, continuing without email', err.message);
  }
};

export const sendRegistrationEmail = async ({ email, fullName, code, expiresAt }) =>
  sendMail({
    to: email,
    subject: 'Verify your AuctionApp account',
    text: `Hello ${fullName || email},\n\nUse the verification code ${code} to activate your account. The code expires at ${expiresAt}.`
  });

export const sendRegistrationConfirmedEmail = async ({ email, fullName }) =>
  sendMail({
    to: email,
    subject: 'Your AuctionApp account is ready',
    text: `Hello ${fullName || email},\n\nYour account has been verified successfully.`
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

export const sendBidderReceipt = async ({ email, productName, amount }) =>
  sendMail({
    to: email,
    subject: 'You placed a bid',
    text: `Your bid of ${amount} on ${productName} is now the leading offer.`
  });

export const sendOutbidNotification = async ({ email, productName, amount }) =>
  sendMail({
    to: email,
    subject: 'You have been outbid',
    text: `Another bidder has surpassed your offer on ${productName}. Latest price: ${amount}.`
  });

export const sendBidRejectedNotification = async ({ email, productName, reason }) =>
  sendMail({
    to: email,
    subject: 'Bid access revoked',
    text: `The seller rejected your participation for ${productName}. Reason: ${reason || 'No reason provided.'}`
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

export const sendAuctionResultNotification = async ({ email, productName, outcome }) =>
  sendMail({
    to: email,
    subject: 'Auction update',
    text: `Auction "${productName}" has ${outcome}.`
  });
