import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "wagmi",
    "viem",
    "@tanstack/react-query",
  ],
  webpack: (config) => {
    // Resolve modules from root node_modules
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      path.resolve(__dirname, "../../node_modules"),
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;
