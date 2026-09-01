import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => `open-prep-v${version}`,
  output: "export",
  reactStrictMode: true,
  trailingSlash: true
};

export default nextConfig;
