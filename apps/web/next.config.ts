import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.r2.dev',
                port: '',
                pathname: '/**'
            }
        ]
    }
}

export default nextConfig

// invalid src prop (https://pub-3d5499766d14438899d5b40cdf9a555e.r2.dev/projects/20260121105921-user_38VxsArycSXQcgq0y4IWg3CnNZ2-043804.jpg) on `next/image`, hostname "pub-3d5499766d14438899d5b40cdf9a555e.r2.dev" is not configured under images in your `next.config.js`
