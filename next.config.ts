import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用服务端外部包
  serverExternalPackages: ["@libsql/client"],

  // 图片域名配置 (Reddit 图片)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "preview.redd.it",
      },
      {
        protocol: "https",
        hostname: "i.redd.it",
      },
    ],
  },
};

export default nextConfig;
