import db from '../db/knex.js';
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
  findProductStatusById,
  insertProduct,
  insertProductImages,
  findProductBySlug,
  findProductByIdForUpdate
} from '../repositories/product.repository.js';
import { findCategoryById } from '../repositories/category.repository.js';
import { insertBid, deleteBidsByUser, findTopBids, countBidsByProduct } from '../repositories/bid.repository.js';
import {
  upsertAutoBid,
  deleteAutoBidsByProductId,
  deleteAutoBidByUser
} from '../repositories/autoBid.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { ApiError } from '../utils/response.js';
import { getExtendSettings, getHighlightNewMinutes } from './setting.service.js';
import { aggregateRating } from '../utils/rating.js';
import { maskBidderName } from '../utils/bid.js';
import { recalcAutoBid } from './autoBid.service.js';
import { addToBidBlacklist } from '../repositories/bidBlacklist.repository.js';
import { isProductWatchlisted } from './watchlist.service.js';
import { ensureOrderForProduct } from './order.service.js';
import {
  sendBidNotification,
  sendBidderReceipt,
  sendOutbidNotification,
  sendBidRejectedNotification,
  sendDescriptionUpdateNotification
} from './mail.service.js';
import { findWatchlistedProductIds } from '../repositories/watchlist.repository.js';
import { findOrderByProduct } from '../repositories/order.repository.js';
import { sendAuctionResultNotification } from './mail.service.js';

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
const PRODUCT_SLUG_MAX_ATTEMPTS = 5;
const MIN_BIDDER_RATING_PERCENT = Number(process.env.MIN_BIDDER_RATING_PERCENT || 80);

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

const slugify = (input) =>
  input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const formatAppendLabel = (date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const minutes = String(absMinutes % 60).padStart(2, '0');
  const timePart = date.toLocaleTimeString('vi-VN', { hour12: false });
  const datePart = date.toLocaleDateString('vi-VN');
  return `EDIT ${datePart} ${timePart} GMT${sign}${hours}:${minutes}`;
};

const resolveDisplayName = (user, viewer, sellerId) => {
  if (!user?.id) return null;
  const identity = user.email || user.fullName || '';
  if (!identity) return null;

  const sellerIdValue = sellerId ? String(sellerId) : null;
  const userId = String(user.id);
  if (sellerIdValue && userId === sellerIdValue) {
    return identity;
  }

  const viewerId = viewer?.id ? String(viewer.id) : null;
  const viewerIsAdmin = viewer?.role === 'ADMIN';
  const viewerIsSeller = viewerId && sellerIdValue && viewerId === sellerIdValue;
  const viewerIsSelf = viewerId && viewerId === userId;

  if (viewerIsAdmin || viewerIsSeller || viewerIsSelf) {
    return identity;
  }

  return maskBidderName(identity);
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
    allowUnratedBidders: Boolean(row.allow_unrated_bidders),
    currentBidderId: row.current_bidder_id,
    currentBidderAlias: row.current_bidder_full_name ? maskBidderName(row.current_bidder_full_name) : null,
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

const summarizeProduct = (row = {}, base = {}) => ({
  id: row.id ?? base.id ?? null,
  currentPrice: Number(row.current_price ?? base.current_price ?? 0),
  currentBidderId: row.current_bidder_id ?? base.current_bidder_id ?? null,
  bidCount: Number(row.bid_count ?? base.bid_count ?? 0),
  endAt: row.end_at ?? base.end_at ?? null,
  status: row.status ?? base.status ?? null
});

const ensureAuctionWindowOpen = (product) => {
  if (!product) {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
  }

  if (product.status !== 'ACTIVE') {
    throw new ApiError(400, 'PRODUCTS.NOT_ACTIVE', 'Auction is not active');
  }

  const now = Date.now();
  const startsAt = new Date(product.start_at).getTime();
  const endsAt = new Date(product.end_at).getTime();

  if (startsAt > now) {
    throw new ApiError(400, 'PRODUCTS.NOT_STARTED', 'Auction has not started yet');
  }

  if (endsAt <= now) {
    throw new ApiError(400, 'PRODUCTS.CLOSED', 'Auction already ended');
  }
};

const calculateRatingPercent = (rating) => {
  const positive = Number(rating?.positive || 0);
  const negative = Number(rating?.negative || 0);
  const total = positive + negative;
  if (total === 0) return 100;
  return (positive / total) * 100;
};

const ensureBidderEligibility = async (userId, sellerId, options = {}) => {
  const { allowUnrated = false } = options;
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'BIDDER.NOT_FOUND', 'Bidder not found');
  }
  if (!['BIDDER', 'SELLER'].includes(user.role)) {
    throw new ApiError(403, 'BIDDER.INVALID_ROLE', 'Only bidder and seller accounts can participate');
  }
  if (user.status !== 'CONFIRMED') {
    throw new ApiError(403, 'BIDDER.UNCONFIRMED', 'Account must be confirmed before bidding');
  }
  if (String(user.id) === String(sellerId)) {
    throw new ApiError(403, 'BIDDER.SELF_BID', 'Sellers cannot bid on their own products');
  }

  const rating = await aggregateRating(userId);
  const totalRatings = Number(rating?.positive || 0) + Number(rating?.negative || 0);
  if (totalRatings === 0 && !allowUnrated) {
    throw new ApiError(
      403,
      'BIDDER.RATING_REQUIRED',
      'Seller has restricted unrated bidders for this product'
    );
  }

  const ratingPercent = calculateRatingPercent(rating);

  if (ratingPercent < MIN_BIDDER_RATING_PERCENT) {
    throw new ApiError(
      403,
      'BIDDER.RATING_TOO_LOW',
      `Bidders need at least ${MIN_BIDDER_RATING_PERCENT}% positive rating`
    );
  }

  return user;
};

const parseBidAmount = (amountRaw, code, message) => {
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amount)) {
    throw new ApiError(422, code, message);
  }
  return amount;
};

const ensureStepCompliance = (amount, startPrice, priceStep) => {
  if ((amount - startPrice) % priceStep !== 0) {
    throw new ApiError(
      422,
      'BIDS.INVALID_STEP',
      'Bid amount must align with the configured step'
    );
  }
};

const computeExtendedEndTime = (product, windowMinutes, extendMinutes) => {
  if (!product.auto_extend) return null;
  const endTime = new Date(product.end_at).getTime();
  const now = Date.now();
  if (endTime <= now) return null;
  const windowMs = windowMinutes * 60 * 1000;
  if (endTime - now > windowMs) return null;
  return new Date(endTime + extendMinutes * 60 * 1000);
};

const collectOutbidIds = (candidateIds = [], finalBidderId = null) => {
  const finalId = finalBidderId ? String(finalBidderId) : null;
  const unique = new Map();
  candidateIds.forEach((id) => {
    if (!id) return;
    const key = String(id);
    if (finalId && key === finalId) return;
    if (!unique.has(key)) {
      unique.set(key, id);
    }
  });
  return Array.from(unique.values());
};

export const listProducts = async ({ page, limit, sort, categoryId }, viewerId = null) => {
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

  if (viewerId) {
    const watchlistedIds = await findWatchlistedProductIds(viewerId, rows.map((row) => row.id));
    const watchlistSet = new Set(watchlistedIds);
    items.forEach((item) => {
      item.isWatchlisted = watchlistSet.has(item.id);
    });
  }

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

export const getProductDetail = async (productId, viewer = null) => {
  const productRow = await findProductByIdWithSeller(productId);
  if (!productRow || productRow.status === 'REMOVED') {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
  }
  const viewerId = viewer?.id ?? null;
  const sellerId = productRow.seller_id;

  const highlightWindowMinutes = await getHighlightNewMinutes();

  const [imagesRows, questionsRows, relatedRows, descriptionHistoryRows] = await Promise.all([
    findProductImages(productRow.id),
    findRecentQuestions(productRow.id, QUESTIONS_LIMIT),
    findRelatedProducts(productRow.category_id, productRow.id, RELATED_LIMIT),
    db('product_description_history').where({ product_id: productRow.id }).orderBy('created_at', 'asc')
  ]);

  const answersRows = await findAnswersByQuestionIds(questionsRows.map((question) => question.id));
  const answersByQuestion = new Map();
  answersRows.forEach((answer) => {
    if (!answersByQuestion.has(answer.question_id)) {
      answersByQuestion.set(answer.question_id, answer);
    }
  });

  const relatedImageMap = await findPrimaryImagesForProducts(relatedRows.map((row) => row.id));

  const [sellerRating, keeperRating, watchlisted, watchlistCount, orderRow] = await Promise.all([
    aggregateRating(productRow.seller_id),
    productRow.current_bidder_id ? aggregateRating(productRow.current_bidder_id) : Promise.resolve(null),
    isProductWatchlisted(viewerId, productRow.id),
    db('watchlist').where({ product_id: productRow.id }).count({ count: '*' }).first(),
    findOrderByProduct(productRow.id)
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
    const askerIdentity = question.asker_id
      ? {
          id: question.asker_id,
          email: question.asker_email,
          fullName: question.asker_name
        }
      : null;
    const responderIdentity = answer?.responder_id
      ? {
          id: answer.responder_id,
          email: answer.responder_email,
          fullName: answer.responder_name
        }
      : null;
    return {
      id: question.id,
      questionText: question.question_text,
      createdAt: question.created_at,
      asker: askerIdentity
        ? {
            id: askerIdentity.id,
            displayName: resolveDisplayName(askerIdentity, viewer, sellerId)
          }
        : null,
      answer: answer
        ? {
            id: answer.id,
            answerText: answer.answer_text,
            createdAt: answer.created_at,
            responder: responderIdentity
              ? {
                  id: responderIdentity.id,
                  displayName: resolveDisplayName(responderIdentity, viewer, sellerId)
                }
              : null
          }
        : null,
      isAnswered: Boolean(answer)
    };
  });

  const relatedProducts = relatedRows.map((row) =>
    mapProduct(row, {
      highlightWindowMinutes,
      primaryImageUrl: relatedImageMap.get(row.id) || null
    })
  );

  const sellerIdentity = {
    id: productRow.seller_id,
    email: productRow.seller_email,
    fullName: productRow.seller_full_name
  };
  const seller = {
    id: productRow.seller_id,
    fullName: productRow.seller_full_name,
    email: productRow.seller_email,
    displayName: resolveDisplayName(sellerIdentity, viewer, sellerId),
    rating: sellerRating
  };

  const keeperIdentity = productRow.current_bidder_id
    ? {
        id: productRow.current_bidder_id,
        email: productRow.current_bidder_email,
        fullName: productRow.current_bidder_full_name
      }
    : null;
  const keeper = keeperIdentity
    ? {
        id: keeperIdentity.id,
        fullName: keeperIdentity.fullName,
        displayName: resolveDisplayName(keeperIdentity, viewer, sellerId),
        rating: keeperRating
      }
    : null;

  const viewerIsSeller = viewerId && String(viewerId) === String(productRow.seller_id);
  const viewerIsWinner = viewerId && orderRow && String(orderRow.winner_id) === String(viewerId);
  const orderForViewer =
    orderRow && (viewerIsSeller || viewerIsWinner)
      ? { id: orderRow.id, status: orderRow.status }
      : null;

  return {
    product,
    seller,
    keeper,
    images,
    questions,
    relatedProducts,
    descriptionHistory: descriptionHistoryRows.map((row) => {
      const createdAt = new Date(row.created_at);
      return {
        id: row.id,
        content: row.content_added,
        createdAt: row.created_at,
        label: formatAppendLabel(createdAt)
      };
    }),
    watchlist: {
      isWatchlisted: Boolean(watchlisted),
      count: Number(watchlistCount?.count || 0)
    },
    permissions: {
      canAppendDescription: Boolean(viewerIsSeller),
      canRejectBidder: Boolean(viewerIsSeller && productRow.current_bidder_id),
      canAnswerQuestions: Boolean(viewerIsSeller)
    },
    orderForViewer
  };
};

export const finalizeEndedAuctions = async () => {
  const expired = await db('products as p')
    .select(
      'p.id',
      'p.seller_id',
      'p.current_bidder_id',
      'p.current_price',
      'p.enable_auto_bid',
      'p.auto_extend',
      'p.end_at',
      'p.name'
    )
    .where('p.status', 'ACTIVE')
    .andWhere('p.end_at', '<=', db.fn.now());

  let processed = 0;
  let withoutWinner = 0;

  for (const product of expired) {
    await db.transaction(async (trx) => {
      const hasWinner = Boolean(product.current_bidder_id);
      const [updated] = await trx('products')
        .where({ id: product.id })
        .update(
          {
            status: 'ENDED',
            enable_auto_bid: false,
            end_at: trx.fn.now(),
            updated_at: trx.fn.now()
          },
          ['id', 'seller_id', 'current_bidder_id', 'current_price', 'name']
        );

      if (hasWinner) {
        await ensureOrderForProduct(
          {
            productId: product.id,
            sellerId: updated.seller_id,
            winnerId: updated.current_bidder_id,
            finalPrice: Number(product.current_price),
            productName: updated.name
          },
          trx
        );
      } else {
        try {
          const seller = await findUserById(product.seller_id);
          if (seller?.email) {
            await sendAuctionResultNotification({
              email: seller.email,
              productName: product.name,
              outcome: 'ended without a winner'
            });
          }
        } catch (err) {
          console.warn('[mail] no-winner notification skipped', err.message);
        }
        withoutWinner += 1;
      }
      processed += 1;
    });
  }

  return { processed, withoutWinner };
};

export const getProductBidHistory = async (
  productId,
  limit = BID_HISTORY_DEFAULT_LIMIT,
  viewer = null
) => {
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
    bidderAlias: resolveDisplayName(
      {
        id: bid.user_id,
        email: bid.bidder_email,
        fullName: bid.bidder_full_name
      },
      viewer,
      product.seller_id
    ),
    amount: Number(bid.bid_amount),
    isAutoBid: bid.is_auto_bid,
    createdAt: bid.created_at
  }));
};

export { mapProduct };

const generateUniqueSlug = async (name) => {
  const baseSlug = slugify(name) || `product-${Date.now()}`;
  for (let attempt = 0; attempt < PRODUCT_SLUG_MAX_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${baseSlug}${suffix}`;
    const existing = await findProductBySlug(candidate);
    if (!existing) return candidate;
  }
  throw new ApiError(500, 'PRODUCTS.SLUG_FAILURE', 'Unable to allocate unique product slug');
};

export const createProductListing = async ({
  sellerId,
  name,
  description,
  categoryId,
  startPrice,
  priceStep,
  buyNowPrice,
  autoExtend,
  enableAutoBid,
  allowUnratedBidders,
  startAt,
  endAt,
  images
}) => {
  if (!Array.isArray(images) || images.length < 3) {
    throw new ApiError(422, 'PRODUCTS.MIN_IMAGES', 'At least three images are required');
  }

  const category = await findCategoryById(categoryId);
  if (!category) {
    throw new ApiError(404, 'PRODUCTS.CATEGORY_NOT_FOUND', 'Category not found');
  }

  const highlightWindowMinutes = await getHighlightNewMinutes();
  const slug = await generateUniqueSlug(name);
  const now = new Date();
  const startDate = startAt ? new Date(startAt) : now;
  const endDate = new Date(endAt);

  const result = await db.transaction(async (trx) => {
    const [productRow] = await insertProduct(
      {
        seller_id: sellerId,
        category_id: categoryId,
        name,
        slug,
        description: description || null,
        start_price: startPrice,
        price_step: priceStep,
        current_price: startPrice,
        buy_now_price: buyNowPrice ?? null,
        auto_extend: autoExtend,
        enable_auto_bid: enableAutoBid,
        allow_unrated_bidders: Boolean(allowUnratedBidders),
        current_bidder_id: null,
        bid_count: 0,
        highlight_until: null,
        status: 'ACTIVE',
        start_at: startDate,
        end_at: endDate,
        created_at: now,
        updated_at: now
      },
      trx
    );

    const imageRecords = images.map((image, index) => ({
      product_id: productRow.id,
      image_url: image.url,
      display_order: index + 1
    }));

    await insertProductImages(imageRecords, trx);

    return {
      product: productRow,
      images: imageRecords
    };
  });

  return {
    product: mapProduct(result.product, {
      highlightWindowMinutes,
      primaryImageUrl: images[0]?.url || null
    }),
    images: result.images.map((row) => ({
      url: row.image_url,
      displayOrder: row.display_order
    }))
  };
};

export const placeManualBid = async ({ productId, userId, amount }) => {
  const bidAmount = parseBidAmount(
    amount,
    'BIDS.INVALID_AMOUNT',
    'Bid amount must be a positive integer'
  );
  const extendSettings = await getExtendSettings();

  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(productId, trx);
    ensureAuctionWindowOpen(product);
    await ensureBidderEligibility(userId, product.seller_id, {
      allowUnrated: Boolean(product.allow_unrated_bidders)
    });
    const previousBidderId = product.current_bidder_id;

    const startPrice = Number(product.start_price);
    const priceStep = Number(product.price_step);
    const currentPrice = Number(product.current_price);
    const minimumAllowed = currentPrice + priceStep;

    if (bidAmount < minimumAllowed) {
      throw new ApiError(
        422,
        'BIDS.AMOUNT_TOO_LOW',
        `Minimum allowable bid is ${minimumAllowed}`
      );
    }

    ensureStepCompliance(bidAmount, startPrice, priceStep);

    const [bidRow] = await insertBid(
      {
        product_id: productId,
        user_id: userId,
        bid_amount: bidAmount,
        is_auto_bid: false
      },
      trx
    );

    const extendedEndAt = computeExtendedEndTime(
      product,
      extendSettings.windowMinutes,
      extendSettings.extendMinutes
    );

    const updatePayload = {
      current_price: bidAmount,
      current_bidder_id: userId,
      bid_count: trx.raw('bid_count + 1'),
      updated_at: trx.fn.now()
    };

    if (extendedEndAt) {
      updatePayload.end_at = extendedEndAt;
    }

    const [updatedRow] = await trx('products')
      .where({ id: productId })
      .update(updatePayload, ['id', 'current_price', 'current_bidder_id', 'bid_count', 'end_at', 'status']);

    let summary = summarizeProduct(updatedRow, product);
    let autoBidTriggered = false;

    if (product.enable_auto_bid) {
      const autoBidResult = await recalcAutoBid(productId, trx, {
        product: { ...product, ...updatedRow }
      });

      if (autoBidResult?.triggered) {
        autoBidTriggered = true;
        summary = summarizeProduct(autoBidResult.product, product);
      }
    }

    try {
      const finalBidderId = summary.currentBidderId;
      const finalPrice = summary.currentPrice;
      const [seller, bidder] = await Promise.all([
        findUserById(product.seller_id),
        findUserById(userId)
      ]);
      if (seller?.email) {
        await sendBidNotification({
          email: seller.email,
          productName: product.name,
          amount: finalPrice
        });
      }
      if (bidder?.email && String(userId) === String(finalBidderId)) {
        await sendBidderReceipt({
          email: bidder.email,
          productName: product.name,
          amount: bidAmount
        });
      }
      const outbidIds = collectOutbidIds([previousBidderId, userId], finalBidderId);
      if (outbidIds.length) {
        const outbidUsers = await Promise.all(outbidIds.map((id) => findUserById(id)));
        await Promise.all(
          outbidUsers
            .filter((user) => user?.email)
            .map((user) =>
              sendOutbidNotification({
                email: user.email,
                productName: product.name,
                amount: finalPrice,
                productId: product.id
              })
            )
        );
      }
    } catch (err) {
      console.warn('[mail] bid notification skipped', err.message);
    }

    return {
      product: summary,
      bid: bidRow,
      autoBidTriggered
    };
  });
};

export const registerAutoBid = async ({ productId, userId, maxBidAmount }) => {
  const parsedAmount = parseBidAmount(
    maxBidAmount,
    'AUTO_BID.INVALID_AMOUNT',
    'Max auto-bid must be a positive integer'
  );

  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(productId, trx);
    ensureAuctionWindowOpen(product);

    if (!product.enable_auto_bid) {
      throw new ApiError(400, 'AUTO_BID.DISABLED', 'Auto-bid is disabled for this product');
    }

    await ensureBidderEligibility(userId, product.seller_id, {
      allowUnrated: Boolean(product.allow_unrated_bidders)
    });

    const startPrice = Number(product.start_price);
    const priceStep = Number(product.price_step);
    const currentPrice = Number(product.current_price);
    const minimumRequired = product.current_bidder_id
      ? currentPrice + priceStep
      : startPrice;

    if (parsedAmount < minimumRequired) {
      throw new ApiError(
        422,
        'AUTO_BID.AMOUNT_TOO_LOW',
        `Max auto-bid must be at least ${minimumRequired}`
      );
    }

    ensureStepCompliance(parsedAmount, startPrice, priceStep);

    const [autoBidRow] = await upsertAutoBid(
      { productId, userId, maxBidAmount: parsedAmount },
      trx
    );

    let summary = summarizeProduct(product);
    const autoBidResult = await recalcAutoBid(productId, trx, { product });
    if (autoBidResult?.product) {
      summary = summarizeProduct(autoBidResult.product, product);
    }

    if (autoBidResult?.triggered) {
      const finalBidderId = summary.currentBidderId;
      const outbidIds = collectOutbidIds([product.current_bidder_id], finalBidderId);
      if (outbidIds.length) {
        try {
          const outbidUsers = await Promise.all(outbidIds.map((id) => findUserById(id)));
          await Promise.all(
            outbidUsers
              .filter((user) => user?.email)
              .map((user) =>
                sendOutbidNotification({
                  email: user.email,
                  productName: product.name,
                  amount: summary.currentPrice,
                  productId: product.id
                })
              )
          );
        } catch (err) {
          console.warn('[mail] outbid notification skipped', err.message);
        }
      }
    }

    return {
      autoBid: autoBidRow,
      product: summary,
      autoBidTriggered: Boolean(autoBidResult?.triggered)
    };
  });
};

export const buyNowProduct = async ({ productId, userId }) => {
  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(productId, trx);
    ensureAuctionWindowOpen(product);
    await ensureBidderEligibility(userId, product.seller_id, {
      allowUnrated: Boolean(product.allow_unrated_bidders)
    });

    if (product.buy_now_price === null) {
      throw new ApiError(400, 'PRODUCTS.NO_BUY_NOW', 'Buy-now option is not available for this product');
    }

    const buyNowPrice = Number(product.buy_now_price);

    const [bidRow] = await insertBid(
      {
        product_id: productId,
        user_id: userId,
        bid_amount: buyNowPrice,
        is_auto_bid: false
      },
      trx
    );

    await deleteAutoBidsByProductId(productId, trx);

    const [updatedRow] = await trx('products')
      .where({ id: productId })
      .update(
        {
          status: 'ENDED',
          current_price: buyNowPrice,
          current_bidder_id: userId,
          bid_count: trx.raw('bid_count + 1'),
          enable_auto_bid: false,
          end_at: trx.fn.now(),
          updated_at: trx.fn.now()
        },
        ['id', 'current_price', 'current_bidder_id', 'bid_count', 'end_at', 'status']
      );

    await ensureOrderForProduct(
      {
        productId,
        sellerId: product.seller_id,
        winnerId: userId,
        finalPrice: buyNowPrice,
        productName: product.name
      },
      trx
    );

    return {
      product: summarizeProduct(updatedRow),
      bid: bidRow
    };
  });
};

export const appendProductDescription = async ({ productId, sellerId, content }) => {
  const trimmed = content?.trim();
  if (!trimmed) {
    throw new ApiError(422, 'PRODUCTS.EMPTY_APPEND', 'Description update cannot be empty');
  }

  const result = await db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(productId, trx);
    if (!product) {
      throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
    }
    if (String(product.seller_id) !== String(sellerId)) {
      throw new ApiError(403, 'PRODUCTS.SELLER_REQUIRED', 'Only the seller can update this product');
    }

    const now = new Date();
    const formattedLabel = formatAppendLabel(now);
    await trx('product_description_history').insert({
      product_id: productId,
      content_added: trimmed,
      created_at: now
    });

    await trx('products')
      .where({ id: productId })
      .update({
        updated_at: trx.fn.now()
      });

    return {
      label: formattedLabel,
      content: trimmed,
      productName: product.name,
      productId: product.id
    };
  });

  Promise.resolve().then(async () => {
    try {
      const [bidderEmails, autoBidEmails] = await Promise.all([
        db('bids as b')
          .leftJoin('users as u', 'u.id', 'b.user_id')
          .where('b.product_id', productId)
          .distinct()
          .pluck('u.email'),
        db('auto_bids as ab')
          .leftJoin('users as u', 'u.id', 'ab.user_id')
          .where('ab.product_id', productId)
          .distinct()
          .pluck('u.email')
      ]);

      const recipients = new Set();
      bidderEmails.filter(Boolean).forEach((email) => recipients.add(email));
      autoBidEmails.filter(Boolean).forEach((email) => recipients.add(email));

      await Promise.all(
        Array.from(recipients).map((email) =>
          sendDescriptionUpdateNotification({
            email,
            productName: result.productName || 'product',
            productId: result.productId
          })
        )
      );
    } catch (err) {
      console.warn('[mail] description update notification skipped', err.message);
    }
  });

  return {
    label: result.label,
    content: result.content
  };
};

export const rejectBidder = async ({ productId, sellerId, bidderId, reason }) => {
  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(productId, trx);
    if (!product) {
      throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
    }
    if (String(product.seller_id) !== String(sellerId)) {
      throw new ApiError(403, 'PRODUCTS.SELLER_REQUIRED', 'Only the seller can reject bidders');
    }

    await addToBidBlacklist(productId, bidderId, reason || null, trx);
    await deleteBidsByUser(productId, bidderId, trx);
    await deleteAutoBidByUser(productId, bidderId, trx);

    const [topBid] = await findTopBids(productId, 1, trx);
    const bidCountRow = await countBidsByProduct(productId, trx);
    const remainingCount = Number(bidCountRow?.count || 0);

    let updatePayload;
    if (topBid) {
      updatePayload = {
        current_price: topBid.bid_amount,
        current_bidder_id: topBid.user_id,
        bid_count: remainingCount
      };
    } else {
      updatePayload = {
        current_price: product.start_price,
        current_bidder_id: null,
        bid_count: 0
      };
    }

    const [updated] = await trx('products')
      .where({ id: productId })
      .update(
        {
          ...updatePayload,
          updated_at: trx.fn.now()
        },
        ['id', 'current_price', 'current_bidder_id', 'bid_count', 'end_at', 'status']
      );

    const autoBidResult = await recalcAutoBid(productId, trx, { product: { ...product, ...updated } });

    try {
      const rejectedUser = await findUserById(bidderId);
      if (rejectedUser?.email) {
        await sendBidRejectedNotification({
          email: rejectedUser.email,
          productName: product.name,
          reason
        });
      }
    } catch (err) {
      console.warn('[mail] reject notification skipped', err.message);
    }

    return {
      product: summarizeProduct(autoBidResult?.product || updated, product),
      autoBidTriggered: Boolean(autoBidResult?.triggered)
    };
  });
};
