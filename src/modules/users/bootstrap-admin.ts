import { config } from "../../config";
import { logger } from "../../infrastructure/logger";
import { findUserExtensionByEmail, findAuthUserByEmail } from "./user.repository";
import { registerUser } from "./user.service";

/**
 * Creates the initial ADMIN account from BOOTSTRAP_ADMIN_EMAIL /
 * BOOTSTRAP_ADMIN_PASSWORD on first boot. Existing accounts are never
 * overwritten. Remove the env vars after the first successful start.
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = config.bootstrapAdminEmail.toLowerCase();
  if (!email || !config.bootstrapAdminPassword) return;

  const [extension, authUser] = await Promise.all([
    findUserExtensionByEmail(email),
    findAuthUserByEmail(email),
  ]);
  if (extension || authUser) {
    logger.info("Bootstrap admin already exists, skipping", { email });
    return;
  }

  await registerUser({
    email,
    password: config.bootstrapAdminPassword,
    name: "Administrator",
    role: "ADMIN",
  });
  logger.info("Bootstrapped initial admin account", { email });
}
