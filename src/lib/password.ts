import bcrypt from "bcryptjs";

// 12 rounds in production (secure)
// 10 rounds in development (faster, still safe for testing)
const SALT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
