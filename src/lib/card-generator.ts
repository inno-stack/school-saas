import crypto from "crypto";
import { prisma } from "./prisma";

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

  const sequence = String(count + offset + 1).padStart(6, "0");
  return `${prefix}-${year}-${sequence}`;
}

export function generatePin(): string {
  return Array.from({ length: 12 }, () =>
    crypto.randomInt(0, 10).toString(),
  ).join("");
}

export async function generateUniquePin(): Promise<string> {
  let pin: string;
  let exists: boolean = true;

  do {
    pin = generatePin();
    const found = await prisma.scratchCard.findUnique({
      where: { pin },
    });
    exists = !!found;
  } while (exists);

  return pin;
}
