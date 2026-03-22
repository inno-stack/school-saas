import crypto from "crypto";
import { prisma } from "./prisma";

// Generates serial: GRE-2026-000001
export async function generateSerial(
  schoolSlug: string,
  schoolId: string,
  offset: number = 0,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = schoolSlug.replace(/-/g, "").substring(0, 3).toUpperCase();

  const count = await prisma.scratchCard.count({
    where: { schoolId },
  });

  // offset ensures each card in a batch gets a unique sequence
  const sequence = String(count + offset + 1).padStart(6, "0");
  return `${prefix}-${year}-${sequence}`;
}

// Generates a unique 12-digit numeric PIN
export function generatePin(): string {
  return Array.from({ length: 12 }, () =>
    crypto.randomInt(0, 10).toString(),
  ).join("");
}

// Ensures PIN is globally unique in DB
export async function generateUniquePin(): Promise<string> {
  let pin: string;
  let exists = true;

  do {
    pin = generatePin();
    const found = await prisma.scratchCard.findUnique({
      where: { pin },
    });
    exists = !!found;
  } while (exists);

  return pin;
}
