import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import { signAuthToken } from "../services/tokenService.js";

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  // Never return password hash to the client.
  delete user.passwordHash;
  return user;
};

export const registerUser = async (req, res) => {
  const { phone, name, role, password, lat, lng } = req.body;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!phone || !password || password.length < 6 || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return res.status(400).json({ message: "phone, location, and password (min 6 chars) are required" });
  }

  const normalizedRole = role || "donor";

  if (normalizedRole === "admin") {
    return res.status(403).json({ message: "Admin cannot be created from public registration." });
  }

  const existing = await User.findOne({ phone });
  if (existing) {
    return res.status(409).json({ message: "User already exists. Please login with password." });
  }

  const onboardingStatus = "approved";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name || "AnnaDaan User",
    phone,
    passwordHash,
    role: normalizedRole,
    onboardingStatus,
    isActive: true,
    location: { type: "Point", coordinates: [lngNum, latNum] }
  });

  return res.json({
    message: "Registration successful",
    user: sanitizeUser(user),
    token: signAuthToken(user)
  });
};

export const loginWithPhonePassword = async (req, res) => {
  const { identifier, phone, password } = req.body;
  const loginIdentifier = identifier || phone;
  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: "phone/email and password are required" });
  }

  const normalizedIdentifier = loginIdentifier.toLowerCase().trim();
  const sharedAdminAliases = (process.env.ADMIN_ALIASES || "admin,owner,annadaan@gmail.com,+919999999999")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const isSharedAdminLogin = sharedAdminAliases.includes(normalizedIdentifier);

  const user = isSharedAdminLogin
    ? await User.findOne({ role: "admin" })
    : await User.findOne(
        normalizedIdentifier.includes("@")
          ? { email: normalizedIdentifier }
          : { phone: loginIdentifier }
      );
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Legacy users created before password auth may not have a stored hash.
  // Return an actionable error instead of crashing bcrypt.compare.
  if (!user.passwordHash) {
    return res.status(400).json({
      message: "This account needs password setup. Please register again with the same phone."
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    message: "Login successful",
    user: sanitizeUser(user),
    token: signAuthToken(user)
  });
};
