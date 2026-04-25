import { Donation } from "../models/Donation.js";
import { Assignment } from "../models/Assignment.js";
import { User } from "../models/User.js";

export const getAdminStats = async (_req, res) => {
  const [users, donors, ngos, volunteers, donations, expired, escalated] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "donor" }),
    User.countDocuments({ role: "ngo" }),
    User.countDocuments({ role: "volunteer" }),
    Donation.countDocuments(),
    Donation.countDocuments({ status: "expired" }),
    Donation.countDocuments({ escalationLevel: "critical" })
  ]);

  return res.json({ users, donors, ngos, volunteers, donations, expired, escalated });
};

export const getAdminUsers = async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter)
    .sort({ reliabilityScore: 1, createdAt: -1 })
    .limit(300)
    .select("-passwordHash");
  const normalizedUsers = users.map((user) => {
    const item = user.toObject();
    if (item.role !== "admin") {
      item.onboardingStatus = item.isActive ? "approved" : "rejected";
    }
    return item;
  });
  return res.json(normalizedUsers);
};

export const getAdminDonations = async (_req, res) => {
  const donations = await Donation.find().sort({ createdAt: -1 }).limit(300);
  return res.json(donations);
};

export const getAdminActivity = async (_req, res) => {
  const [recentUsers, recentDonations] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(8).select("name role createdAt"),
    Donation.find().sort({ createdAt: -1 }).limit(8).select("foodType status createdAt quantity")
  ]);
  return res.json({ recentUsers, recentDonations });
};

export const deleteManagedUser = async (req, res) => {
  const { userId } = req.params;
  const adminUserId = req.authUser?._id?.toString();
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  const targetUser = await User.findById(userId).select("role");
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (targetUser.role === "admin") {
    return res.status(403).json({ message: "Admin accounts cannot be deleted from this panel" });
  }

  if (adminUserId && userId.toString() === adminUserId) {
    return res.status(403).json({ message: "You cannot delete your own account" });
  }

  let impactedDonations = 0;
  if (targetUser.role === "donor") {
    const donorDeleteResult = await Donation.deleteMany({ donorId: userId });
    impactedDonations = donorDeleteResult.deletedCount || 0;
  }

  if (targetUser.role === "ngo") {
    const ngoResetResult = await Donation.updateMany(
      {
        acceptedByNgoId: userId,
        status: { $in: ["accepted", "picked"] }
      },
      {
        $set: { status: "pending" },
        $unset: { acceptedByNgoId: 1, deliveryProof: 1 }
      }
    );
    impactedDonations = ngoResetResult.modifiedCount || 0;
  }

  await Assignment.deleteMany({ volunteerId: userId });
  await User.findByIdAndDelete(userId);

  return res.json({
    success: true,
    deletedUserId: userId,
    role: targetUser.role,
    impactedDonations
  });
};
