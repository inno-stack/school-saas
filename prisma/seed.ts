import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "superadmin@educore.com";
  const password = "SuperAdmin@123";

  // Check if super admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Super admin already exists:", email);
    return;
  }

  // Create a system school for super admin
  let systemSchool = await prisma.school.findUnique({
    where: { slug: "system" },
  });

  if (!systemSchool) {
    systemSchool = await prisma.school.create({
      data: {
        name: "EduCore System",
        slug: "system",
        email: "system@educore.com",
      },
    });
  }

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

  console.log("✅ Super admin created:");
  console.log("   Email:   ", superAdmin.email);
  console.log("   Password:", password);
  console.log("   Role:    ", superAdmin.role);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
