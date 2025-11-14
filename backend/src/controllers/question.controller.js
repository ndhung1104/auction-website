import Joi from 'joi';
import { answerQuestion, askQuestion } from '../services/question.service.js';
import { ApiError, sendSuccess } from '../utils/response.js';

const questionSchema = Joi.object({
  questionText: Joi.string().min(5).max(2000).required()
});

const answerSchema = Joi.object({
  answerText: Joi.string().min(2).max(2000).required()
});

const questionParamSchema = Joi.object({
  productId: Joi.number().integer().min(1).required()
});

const answerParamSchema = Joi.object({
  questionId: Joi.number().integer().min(1).required()
});

export const createQuestion = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = questionParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (paramsError) {
      throw new ApiError(
        422,
        'QUESTIONS.INVALID_PRODUCT',
        'Invalid product identifier',
        paramsError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const { value, error } = questionSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'QUESTIONS.INVALID_PAYLOAD',
        'Invalid question payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await askQuestion({
      productId: params.productId,
      userId: req.user.id,
      questionText: value.questionText
    });

    return sendSuccess(res, { question: payload }, 'Question submitted');
  } catch (err) {
    next(err);
  }
};

export const createAnswer = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = answerParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (paramsError) {
      throw new ApiError(
        422,
        'ANSWERS.INVALID_ID',
        'Invalid question identifier',
        paramsError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const { value, error } = answerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'ANSWERS.INVALID_PAYLOAD',
        'Invalid answer payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await answerQuestion({
      questionId: params.questionId,
      userId: req.user.id,
      answerText: value.answerText
    });

    return sendSuccess(res, { answer: payload }, 'Answer submitted');
  } catch (err) {
    next(err);
  }
};
