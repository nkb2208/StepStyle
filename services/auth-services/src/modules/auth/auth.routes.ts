import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { apiLimiter, authLimiter, forgotPasswordLimiter, refreshLimiter } from "../../middleware/rate-limit";
import { AuthController } from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, AuthController.register);
router.post("/login", authLimiter, AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.post("/refresh", refreshLimiter, AuthController.refresh);
router.get("/me", authenticate, AuthController.me);
router.post("/forgot-password", forgotPasswordLimiter, AuthController.forgotPassword);
router.post("/reset-password", apiLimiter, AuthController.resetPassword);
router.post("/change-password", authenticate, AuthController.changePassword);
router.post("/verify-email", apiLimiter, AuthController.verifyEmail);
router.post("/token", authLimiter, AuthController.clientCredentials);

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { service: "auth", status: "ok" } });
});

export default router;
