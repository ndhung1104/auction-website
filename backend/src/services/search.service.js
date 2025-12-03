import { searchProducts, searchCategories } from '../repositories/search.repository.js';
import { findPrimaryImagesForProducts } from '../repositories/product.repository.js';
import { getHighlightNewMinutes } from './setting.service.js';
import { mapProduct } from './product.service.js';

export const searchActiveProducts = async ({ term, limit, offset, categoryId, sort }) => {
  const { rows, total } = await searchProducts({ term, limit, offset, categoryId, sort });
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

export const searchCategoriesByName = async ({ term, limit }) => {
  const rows = await searchCategories({ term, limit });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id
  }));
};
