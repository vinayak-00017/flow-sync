/* eslint-disable @typescript-eslint/no-require-imports */

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add Monaco webpack plugin only on client side
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["javascript", "typescript", "html", "css", "json"],
          filename: "static/[name].worker.js",
        })
      );
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
