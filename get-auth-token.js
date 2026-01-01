/**
 * Helper script to get authentication token
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:8000/api';
const EMAIL = 'sinchwara@gmail.com';
const PASSWORD = 'password123';

async function getAuthToken() {
  try {
    console.log('🔐 Authenticating...');
    console.log('Email:', EMAIL);
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    const result = await response.json();

    if (response.ok && (result.token || result.data?.token)) {
      const token = result.token || result.data.token;
      console.log('✅ Authentication successful!');
      console.log('\n📋 Token:', token);
      return token;
    } else {
      console.error('❌ Authentication failed');
      console.error('Response:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Export for use in other scripts
module.exports = { getAuthToken, API_BASE_URL };

// Run if called directly
if (require.main === module) {
  getAuthToken().then(token => {
    if (token) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}
