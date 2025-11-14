import { searchProducts } from '../repositories/search.repository.js';
import { findPrimaryImagesForProducts } from '../repositories/product.repository.js';
import { getHighlightNewMinutes } from './setting.service.js';
import { mapProduct } from './product.service.js';

export const searchActiveProducts = async ({ term, limit, offset }) => {
  const { rows, total } = await searchProducts({ term, limit, offset });
  if (!rows.length) {
    return { items: [], total };
  }

  const highlightWindowMinutes = await getHighlightNewMinutes();
  const imageMap = await findPrimaryImagesForProducts(rows.map((row) => row.id));

  const items = rows.map((row) =>
    mapProduct(row, {
      highlightWindowMinutes,
      primaryImageUrl: imageMap.get(row.id) || null
    })
  );

  return { items, total };
};
