import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use the standard client for the seeding process
const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@educore.com";
  const password = "SuperAdmin@123";

  // 1. Check for existing super admin
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Super admin already exists:", email);
    return;
  }

  // 2. Ensure System School exists
  const systemSchool = await prisma.school.upsert({
    where: { slug: "system" },
    update: {},
    create: {
      name: "EduCore System",
      slug: "system",
      email: "system@educore.com",
    },
  });

  // 3. Hash and Create
  const hashedPassword = await bcrypt.hash(password, 12);

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

  console.log("✅ Super admin created successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });