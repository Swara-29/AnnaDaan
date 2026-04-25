import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

const run = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || "annadaan@gmail.com";
  const phone = process.env.ADMIN_PHONE || "+919999999999";
  const password = process.env.ADMIN_PASSWORD || "annadaan123!";
  const name = process.env.ADMIN_NAME || "annadaan";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.findOneAndUpdate(
    { $or: [{ email }, { phone }] },
    {
      name,
      email,
      phone,
      passwordHash,
      role: "admin",
      onboardingStatus: "approved",
      isActive: true,
      location: { type: "Point", coordinates: [0, 0] }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await User.updateMany(
    { role: "admin", _id: { $ne: admin._id } },
    { $set: { role: "ngo", onboardingStatus: "approved", isActive: true } }
  );

  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
