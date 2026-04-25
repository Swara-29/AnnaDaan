import { User } from "../models/User.js";

export const getUsers = async (req, res) => {
  const { role, onboardingStatus } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (onboardingStatus) filter.onboardingStatus = onboardingStatus;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  return res.json(users);
};

export const updateUserModeration = async (req, res) => {
  const { userId } = req.params;
  const { onboardingStatus, isActive, role } = req.body;
  const updates = {};

  if (onboardingStatus) updates.onboardingStatus = onboardingStatus;
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (role && role !== "admin") updates.role = role;
  if (onboardingStatus === "rejected") updates.isActive = false;

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(user);
};
