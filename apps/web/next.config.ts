import type { NextConfig } from "next"

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100")

const nextConfig: NextConfig = {
  // Self-hosted (Docker/Dokploy): bundles only the traced dependencies into .next/standalone.
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/types", "@workspace/auth", "@workspace/validators"],
  images: {
    // Local development serves uploads from http://localhost; the optimizer refuses private IPs unless allowed.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      // Uploaded files (product images, logos) are served by the API.
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        ...(apiUrl.port ? { port: apiUrl.port } : {}),
        pathname: "/api/files/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
  // Routes from the original site keep working: old URLs redirect (permanently) to their new home.
  async redirects() {
    return [
      { source: "/catalogue", destination: "/products", permanent: true },
      {
        source: "/catalogue/:category",
        destination: "/categories/:category",
        permanent: true,
      },
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      { source: "/suppliers", destination: "/vendors", permanent: true },
      {
        source: "/suppliers/:slug",
        destination: "/vendors/:slug",
        permanent: true,
      },
      { source: "/dashboard", destination: "/account", permanent: false },
      {
        source: "/dashboard/customer/:path*",
        destination: "/buyer",
        permanent: false,
      },
      {
        source: "/dashboard/vendor/listings",
        destination: "/vendor/products",
        permanent: false,
      },
      {
        source: "/dashboard/vendor/enquiries",
        destination: "/vendor/inquiries",
        permanent: false,
      },
      {
        source: "/dashboard/vendor/:path*",
        destination: "/vendor",
        permanent: false,
      },
      {
        source: "/dashboard/admin/accounts",
        destination: "/admin/users",
        permanent: false,
      },
      {
        source: "/dashboard/admin/listings",
        destination: "/admin/products",
        permanent: false,
      },
      {
        source: "/dashboard/admin/categories",
        destination: "/admin/categories",
        permanent: false,
      },
      {
        source: "/dashboard/admin/:path*",
        destination: "/admin",
        permanent: false,
      },
      {
        source: "/my-requirements",
        destination: "/buyer/inquiries",
        permanent: false,
      },
      {
        source: "/my-enquiries",
        destination: "/buyer/inquiries",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
