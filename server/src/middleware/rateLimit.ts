import rateLimit from "express-rate-limit";

// Per-IP, for login/register/reset — protects against brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, try again in 15min" },
  skipSuccessfulRequests: false,
});

// Stricter for forgot password — 3/hour per IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many password reset requests" },
});

