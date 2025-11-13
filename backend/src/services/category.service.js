import { getAllCategories } from '../repositories/category.repository.js';

const mapCategory = (category) => ({
  id: category.id,
  name: category.name,
  parentId: category.parent_id,
  children: []
});

export const fetchCategoryTree = async () => {
  const rows = await getAllCategories();
  const nodeMap = new Map();
  const roots = [];

  rows.forEach((row) => {
    nodeMap.set(row.id, mapCategory(row));
  });

  rows.forEach((row) => {
    const node = nodeMap.get(row.id);
    if (row.parent_id && nodeMap.has(row.parent_id)) {
      nodeMap.get(row.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};
