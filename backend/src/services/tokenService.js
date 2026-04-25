import jwt from "jsonwebtoken";

export const signAuthToken = (user) => {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    secret,
    { expiresIn: "7d" }
  );
};

export const verifyAuthToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return jwt.verify(token, secret);
};
