/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 禁用严格模式以防止 Vditor 重复初始化
  eslint: {
    ignoreDuringBuilds: true, // 编译时跳过检查，保证部署速度
  },
  typescript: {
    ignoreBuildErrors: true, // 跳过 TS 错误检查
  }
};

export default nextConfig;
