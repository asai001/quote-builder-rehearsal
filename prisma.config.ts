import { defineConfig } from "prisma/config";

// マイグレーションとシードは「直結」の DATABASE_URL を使う（Vercel のビルド時に実行）。
// 手元やビルド環境に DATABASE_URL が無くても prisma generate は通るようにしている。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
