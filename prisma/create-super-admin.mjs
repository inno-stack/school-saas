import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "superadmin@InnoCore.com";
  const password = "SuperAdmin@123";

  // ── Check if already exists ────────────────────
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Super admin already exists:", email);
    await prisma.$disconnect();
    return;
  }

  // ── Create system school if not exists ─────────
  let systemSchool = await prisma.school.findUnique({
    where: { slug: "system" },
  });

  if (!systemSchool) {
    systemSchool = await prisma.school.create({
      data: {
        name: "InnoCore System",
        slug: "system",
        email: "system@InnoCore.com",
      },
    });
    console.log("✅ System school created:", systemSchool.id);
  }

  // ── Hash password ──────────────────────────────
  const hashedPassword = await bcrypt.hash(password, 12);

  // ── Create super admin ─────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      schoolId: systemSchool.id,
    },
  });

  console.log("✅ Super admin created successfully!");
  console.log("   ID:      ", superAdmin.id);
  console.log("   Email:   ", superAdmin.email);
  console.log("   Password:", password);
  console.log("   Role:    ", superAdmin.role);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
