import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  output: "standalone",
  // ????????? https://amtopa.com/black-market-auction???
  // ????? NEXT_PUBLIC_BASE_PATH ?????????????????
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
