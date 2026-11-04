const isProd = (process.env.NODE_ENV || 'development').toLowerCase().trim() === 'production';

export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  database: {
    uri: process.env.MONGODB_URI || (isProd ? '' : 'mongodb://127.0.0.1:27017/brands_creators_dev'),
  },
  jwt: {
    accessSecret: isProd ? process.env.JWT_ACCESS_SECRET : (process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_brands_creators_2026'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: isProd ? process.env.JWT_REFRESH_SECRET : (process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_brands_creators_2026'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@brandsandcreators.com',
    password: isProd ? process.env.SUPER_ADMIN_PASSWORD : (process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@Brands2026!'),
    name: process.env.SUPER_ADMIN_NAME || 'Brands & Creators Super Admin',
  },
  notifications: {
    cronSecret: isProd ? process.env.CRON_SECRET : (process.env.CRON_SECRET || 'dev_cron_secret_brands_creators_2026'),
  },
});
