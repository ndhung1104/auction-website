import { ApiError } from '../utils/response.js';
import { findProductByIdWithSeller } from '../repositories/product.repository.js';
import { createQuestion, findQuestionById } from '../repositories/question.repository.js';
import { createAnswer, findAnswerByQuestionId } from '../repositories/answer.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { sendAnswerNotification, sendQuestionNotification } from './mail.service.js';
import db from '../db/knex.js';

export const askQuestion = async ({ productId, userId, questionText }) => {
  if (!userId) {
    throw new ApiError(401, 'QUESTIONS.UNAUTHORIZED', 'Authentication required to ask questions');
  }

  const product = await findProductByIdWithSeller(productId);
  if (!product || product.status !== 'ACTIVE') {
    throw new ApiError(400, 'QUESTIONS.INVALID_PRODUCT', 'Cannot submit questions for this product');
  }

  const trimmed = questionText?.trim();
  if (!trimmed) {
    throw new ApiError(422, 'QUESTIONS.EMPTY', 'Question text is required');
  }

  if (String(product.seller_id) === String(userId)) {
    throw new ApiError(403, 'QUESTIONS.SELLER_FORBIDDEN', 'Seller cannot ask a question on own product');
  }

  const [question] = await createQuestion({
    product_id: productId,
    user_id: userId,
    question_text: trimmed
  });

  // Fire-and-forget email to avoid blocking the response
  Promise.resolve().then(async () => {
    try {
      if (product.seller_email) {
        await sendQuestionNotification({
          email: product.seller_email,
          productName: product.name,
          questionText: trimmed
        });
      }
    } catch (err) {
      console.warn('[mail] question notification skipped', err.message);
    }
  });

  return {
    id: question.id,
    productId: question.product_id,
    userId: question.user_id,
    questionText: question.question_text,
    createdAt: question.created_at
  };
};

export const answerQuestion = async ({ questionId, userId, userRole, answerText }) => {
  const trimmed = answerText?.trim();
  if (!trimmed) {
    throw new ApiError(422, 'ANSWERS.EMPTY', 'Answer text is required');
  }

  const question = await findQuestionById(questionId);
  if (!question) {
    throw new ApiError(404, 'QUESTIONS.NOT_FOUND', 'Question not found');
  }

  const product = await findProductByIdWithSeller(question.product_id);
  if (!product || (String(product.seller_id) !== String(userId) && userRole !== 'ADMIN')) {
    throw new ApiError(403, 'ANSWERS.FORBIDDEN', 'Only the product owner can answer');
  }

  const existingAnswer = await findAnswerByQuestionId(questionId);
  if (existingAnswer) {
    throw new ApiError(409, 'ANSWERS.EXISTS', 'Question already answered');
  }

  const [answer] = await createAnswer({
    question_id: questionId,
    user_id: userId,
    answer_text: trimmed
  });

  try {
    const product = await findProductByIdWithSeller(question.product_id);
    const [asker, bidderEmails] = await Promise.all([
      findUserById(question.user_id),
      db('bids as b')
        .leftJoin('users as u', 'u.id', 'b.user_id')
        .where('b.product_id', question.product_id)
        .distinct()
        .pluck('u.email')
    ]);
    const recipients = new Set();
    if (asker?.email) recipients.add(asker.email);
    bidderEmails.filter(Boolean).forEach((email) => recipients.add(email));

    await Promise.all(
      Array.from(recipients).map((email) =>
        sendAnswerNotification({
          email,
          productName: product?.name || 'product',
          answerText: trimmed
        })
      )
    );
  } catch (err) {
    console.warn('[mail] answer notification skipped', err.message);
  }

  return {
    id: answer.id,
    questionId: answer.question_id,
    userId: answer.user_id,
    answerText: answer.answer_text,
    createdAt: answer.created_at
  };
};
