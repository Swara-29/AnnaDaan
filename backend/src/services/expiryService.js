import { Donation } from "../models/Donation.js";
import { User } from "../models/User.js";
import { recomputeReliabilityScore } from "./reliabilityService.js";

export const expireStaleDonations = async (io) => {
  const now = new Date();
  const staleDonations = await Donation.find({
    status: { $in: ["pending", "accepted", "picked"] },
    expiryTime: { $lt: now }
  });

  if (!staleDonations.length) return 0;

  for (const donation of staleDonations) {
    donation.status = "expired";
    donation.escalationLevel = "critical";
    await donation.save();

    await User.findByIdAndUpdate(donation.donorId, {
      $inc: { "stats.donationsExpired": 1 }
    });
    await recomputeReliabilityScore(donation.donorId);
    await recomputeReliabilityScore(donation.acceptedByNgoId);
  }

  if (io) {
    io.emit("donation:expired", {
      count: staleDonations.length,
      donations: staleDonations.map((item) => item._id)
    });
  }
  return staleDonations.length;
};

export const startExpiryMonitor = (io) => {
  // Keep expiry transitions automatic without requiring manual admin action.
  const intervalMs = Number(process.env.EXPIRY_SWEEP_MS || 60000);
  setInterval(() => {
    expireStaleDonations(io).catch(() => {});
  }, intervalMs);
};

