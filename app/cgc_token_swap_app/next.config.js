const nextConfig = {
    webpack5: true,
    reactStrictMode: true,
    webpack: (config, {isServer}) => {
        if (!isServer) {
            config.resolve.fallback.fs = false;
        }
        return config;
    },
    env: {
        NEXT_PUBLIC_CLUSTER: process.env.NEXT_PUBLIC_CLUSTER || 'devnet',
        NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'
    }
}

module.exports = nextConfig
