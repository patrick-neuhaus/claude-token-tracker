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

// Webhook — 120/min per IP (collectors can send batches)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Webhook rate limit exceeded" },
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "";
    // Loopback skip — collectors locais não são ameaça
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  },
});
