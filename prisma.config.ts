import "dotenv/config"; // Important: Loads your .env variables
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"), // The CLI now looks here for the connection string
  },
});
