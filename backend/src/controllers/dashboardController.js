import { Donation } from "../models/Donation.js";
import { User } from "../models/User.js";

export const getDashboard = async (req, res) => {
  const [users, totalDonations, pending, delivered] = await Promise.all([
    User.countDocuments(),
    Donation.countDocuments(),
    Donation.countDocuments({ status: "pending" }),
    Donation.countDocuments({ status: "delivered" })
  ]);

  return res.json({
    users,
    totalDonations,
    pending,
    delivered
  });
};
