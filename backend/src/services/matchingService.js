export const scoreDonation = ({ distanceKm, minutesToExpiry }) => {
  const distanceScore = Math.max(0, 100 - distanceKm * 10);
  const urgencyScore = minutesToExpiry <= 120 ? 100 : Math.max(0, 100 - (minutesToExpiry - 120) / 6);
  return Math.round(distanceScore * 0.6 + urgencyScore * 0.4);
};
