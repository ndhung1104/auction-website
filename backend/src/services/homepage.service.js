import {
  findEndingSoonProducts,
  findMostBiddedProducts,
  findTopPriceProducts,
  findPrimaryImagesForProducts
} from '../repositories/product.repository.js';
import { getHighlightNewMinutes } from './setting.service.js';
import { mapProduct } from './product.service.js';

const SECTION_LIMIT = 5;

export const buildHomepagePayload = async () => {
  const highlightWindowMinutes = await getHighlightNewMinutes();
  const [topPriceRows, endingSoonRows, mostBiddedRows] = await Promise.all([
    findTopPriceProducts(SECTION_LIMIT),
    findEndingSoonProducts(SECTION_LIMIT),
    findMostBiddedProducts(SECTION_LIMIT)
  ]);

  const uniqueProductIds = Array.from(
    new Set([
      ...topPriceRows.map((row) => row.id),
      ...endingSoonRows.map((row) => row.id),
      ...mostBiddedRows.map((row) => row.id)
    ])
  );

  const imageMap = await findPrimaryImagesForProducts(uniqueProductIds);

  const mapRow = (row) =>
    mapProduct(row, {
      highlightWindowMinutes,
      primaryImageUrl: imageMap.get(row.id) || null
    });

  return {
    topPrice: topPriceRows.map(mapRow),
    endingSoon: endingSoonRows.map(mapRow),
    mostBidded: mostBiddedRows.map(mapRow)
  };
};
