import {
  countActiveProducts,
  findActiveProducts,
  findProductByIdWithSeller,
  findProductImages,
  findRecentQuestions,
  findAnswersByQuestionIds,
  findRelatedProducts,
  findPrimaryImagesForProducts,
  findProductBidsWithUsers,
  findProductStatusById
} from '../repositories/product.repository.js';
import { ApiError } from '../utils/response.js';
import { getHighlightNewMinutes } from './setting.service.js';
import { aggregateRating } from '../utils/rating.js';
import { maskBidderName } from '../utils/bid.js';

const SORT_FIELDS = {
  'end_at': 'end_at',
  'price': 'current_price',
  'bid_count': 'bid_count',
  'created_at': 'created_at'
};

const DEFAULT_SORT = { field: 'end_at', direction: 'asc' };
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 60;
const QUESTIONS_LIMIT = 10;
const RELATED_LIMIT = 5;
const BID_HISTORY_DEFAULT_LIMIT = 20;
const BID_HISTORY_MAX_LIMIT = 50;

const normalizeSort = (sortRaw) => {
  if (!sortRaw) return DEFAULT_SORT;
  const [fieldRaw, dirRaw] = sortRaw.split(',');
  const normalizedField = SORT_FIELDS[fieldRaw?.toLowerCase()];
  const normalizedDirection = dirRaw?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (!normalizedField) {
    throw new ApiError(400, 'PRODUCTS.INVALID_SORT', 'Unsupported sort parameter');
  }

  return { field: normalizedField, direction: normalizedDirection };
};

const normalizePagination = ({ page, limit }) => {
  const safePage = Number.isInteger(page) && page > 0 ? page : DEFAULT_PAGE;
  let safeLimit = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
  safeLimit = Math.min(safeLimit, MAX_LIMIT);
  const offset = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, offset };
};

const mapProduct = (row, { highlightWindowMinutes = 60, primaryImageUrl = null } = {}) => {
  const createdAtIso = row.created_at ? new Date(row.created_at) : null;
  const isNew = highlightWindowMinutes > 0 && createdAtIso
    ? Date.now() - createdAtIso.getTime() <= highlightWindowMinutes * 60 * 1000
    : false;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    sellerId: row.seller_id,
    startPrice: Number(row.start_price),
    priceStep: Number(row.price_step),
    currentPrice: Number(row.current_price),
    buyNowPrice: row.buy_now_price !== null ? Number(row.buy_now_price) : null,
    autoExtend: row.auto_extend,
    enableAutoBid: row.enable_auto_bid,
    currentBidderId: row.current_bidder_id,
    bidCount: Number(row.bid_count),
    highlightUntil: row.highlight_until,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isNew,
    primaryImageUrl
  };
};

export const listProducts = async ({ page, limit, sort, categoryId }) => {
  const { field, direction } = normalizeSort(sort);
  const pagination = normalizePagination({ page, limit });
  const filters = {};

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  const highlightWindowMinutes = await getHighlightNewMinutes();

  const [total, rows] = await Promise.all([
    countActiveProducts(filters),
    findActiveProducts(filters, {
      limit: pagination.limit,
      offset: pagination.offset,
      sortField: field,
      sortDirection: direction
    })
  ]);

  const imageMap = await findPrimaryImagesForProducts(rows.map((row) => row.id));

  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);
  const items = rows.map((row) =>
    mapProduct(row, {
      highlightWindowMinutes,
      primaryImageUrl: imageMap.get(row.id) || null
    })
  );

  return {
    items,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      sort: { field, direction }
    }
  };
};

export const getProductDetail = async (productId) => {
  const productRow = await findProductByIdWithSeller(productId);
  if (!productRow || productRow.status !== 'ACTIVE') {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found or inactive');
  }

  const highlightWindowMinutes = await getHighlightNewMinutes();

  const [imagesRows, questionsRows, relatedRows] = await Promise.all([
    findProductImages(productRow.id),
    findRecentQuestions(productRow.id, QUESTIONS_LIMIT),
    findRelatedProducts(productRow.category_id, productRow.id, RELATED_LIMIT)
  ]);

  const answersRows = await findAnswersByQuestionIds(questionsRows.map((question) => question.id));
  const answersByQuestion = new Map();
  answersRows.forEach((answer) => {
    if (!answersByQuestion.has(answer.question_id)) {
      answersByQuestion.set(answer.question_id, answer);
    }
  });

  const relatedImageMap = await findPrimaryImagesForProducts(relatedRows.map((row) => row.id));

  const [sellerRating, keeperRating] = await Promise.all([
    aggregateRating(productRow.seller_id),
    productRow.current_bidder_id ? aggregateRating(productRow.current_bidder_id) : Promise.resolve(null)
  ]);

  const firstImageUrl = imagesRows[0]?.image_url ?? null;
  const product = mapProduct(productRow, { highlightWindowMinutes, primaryImageUrl: firstImageUrl });
  const images = imagesRows.map((image) => ({
    id: image.id,
    url: image.image_url,
    displayOrder: image.display_order
  }));

  const questions = questionsRows.map((question) => {
    const answer = answersByQuestion.get(question.id);
    return {
      id: question.id,
      questionText: question.question_text,
      createdAt: question.created_at,
      asker: question.asker_id
        ? {
            id: question.asker_id,
            fullName: question.asker_name
          }
        : null,
      answer: answer
        ? {
            id: answer.id,
            answerText: answer.answer_text,
            createdAt: answer.created_at,
            responder: answer.responder_id
              ? {
                  id: answer.responder_id,
                  fullName: answer.responder_name
                }
              : null
          }
        : null
    };
  });

  const relatedProducts = relatedRows.map((row) =>
    mapProduct(row, {
      highlightWindowMinutes,
      primaryImageUrl: relatedImageMap.get(row.id) || null
    })
  );

  const seller = {
    id: productRow.seller_id,
    fullName: productRow.seller_full_name,
    email: productRow.seller_email,
    rating: sellerRating
  };

  const keeper = productRow.current_bidder_id
    ? {
        id: productRow.current_bidder_id,
        fullName: productRow.current_bidder_full_name,
        rating: keeperRating
      }
    : null;

  return {
    product,
    seller,
    keeper,
    images,
    questions,
    relatedProducts
  };
};

export const getProductBidHistory = async (productId, limit = BID_HISTORY_DEFAULT_LIMIT) => {
  const product = await findProductStatusById(productId);
  if (!product) {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
  }

  const safeLimit = Math.min(Math.max(limit, 1), BID_HISTORY_MAX_LIMIT);
  const bids = await findProductBidsWithUsers(productId, safeLimit);

  return bids.map((bid) => ({
    id: bid.id,
    productId: bid.product_id,
    bidderId: bid.user_id,
    bidderAlias: maskBidderName(bid.bidder_full_name),
    amount: Number(bid.bid_amount),
    isAutoBid: bid.is_auto_bid,
    createdAt: bid.created_at
  }));
};

export { mapProduct };
