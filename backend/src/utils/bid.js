export const maskBidderName = (name) => {
  if (!name) return '';
  if (name.length <= 2) return `${name.charAt(0)}*`;
  return `${name.charAt(0)}${'*'.repeat(name.length - 2)}${name.charAt(name.length - 1)}`;
};