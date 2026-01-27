// Environment configuration utility
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8000/",
  },

  // Email Configuration
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
  },

  // WhatsApp Configuration
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v21.0",
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    catalogId: process.env.WHATSAPP_CATALOG_ID,
  },

  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}

// Helper function to get environment-specific API URL
export const getApiUrl = (path: string = '') => {
  const baseUrl = config.api.baseUrl;
  console.log(`API Base URL: ${baseUrl}, Path: ${path}`);
  return `${baseUrl}${path}`
}

// Helper function to get app URL
export const getAppUrl = (path: string = '') => {
  return `${config.api.appUrl}${path}`
}