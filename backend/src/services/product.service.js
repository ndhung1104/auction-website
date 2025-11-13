import { countActiveProducts, findActiveProducts } from '../repositories/product.repository.js';
import { ApiError } from '../utils/response.js';

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

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
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
  updatedAt: row.updated_at
});

export const listProducts = async ({ page, limit, sort, categoryId }) => {
  const { field, direction } = normalizeSort(sort);
  const pagination = normalizePagination({ page, limit });
  const filters = {};

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  const [total, rows] = await Promise.all([
    countActiveProducts(filters),
    findActiveProducts(filters, {
      limit: pagination.limit,
      offset: pagination.offset,
      sortField: field,
      sortDirection: direction
    })
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);

  return {
    items: rows.map(mapProduct),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      sort: { field, direction }
    }
  };
};
