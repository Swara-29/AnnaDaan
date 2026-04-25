import { User } from "../models/User.js";
import { verifyAuthToken } from "../services/tokenService.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.authUser = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.authUser?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" });
  }
  return next();
};
