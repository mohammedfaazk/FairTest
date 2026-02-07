const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@fairtest/sui-integration',
    '@fairtest/ens-integration',
    '@fairtest/yellow-integration',
    '@fairtest/identity',
    '@fairtest/core',
  ],
  env: {
    // Expose Sui configuration to browser
    NEXT_PUBLIC_SUI_PACKAGE_ID: process.env.SUI_PACKAGE_ID,
    NEXT_PUBLIC_SUI_NETWORK: process.env.SUI_NETWORK || 'testnet',
    NEXT_PUBLIC_SUI_RPC_URL: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    NEXT_PUBLIC_PLATFORM_LISTING_FEE: process.env.PLATFORM_LISTING_FEE || '0.01',
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
    };
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:crypto$/, require.resolve('crypto-browserify'))
    );
    
    // Externalize ws package for browser builds
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        ws: 'WebSocket',
      });
    }
    
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@mysten/sui', '@mysten/sui.js'],
  },
};

module.exports = nextConfig;
