import { User } from "../models/User.js";

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const recomputeReliabilityScore = async (userId) => {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const stats = user.stats || {};
  const created = stats.donationsCreated || 0;
  const delivered = stats.donationsDelivered || 0;
  const expired = stats.donationsExpired || 0;
  const acceptances = stats.acceptances || 0;
  const completions = stats.completions || 0;

  const donorScore = created > 0 ? ((delivered + 1) / (created + expired + 1)) * 100 : 80;
  const operatorScore = acceptances > 0 ? ((completions + 1) / (acceptances + 1)) * 100 : 80;
  const reliabilityScore = clampScore(donorScore * 0.55 + operatorScore * 0.45);

  user.reliabilityScore = reliabilityScore;
  await user.save();
  return reliabilityScore;
};

