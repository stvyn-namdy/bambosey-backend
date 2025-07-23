const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Test configuration
const testConfig = {
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Create axios instance
const api = axios.create(testConfig);

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing Health Check...');
  try {
    const response = await api.get('/health');
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('👤 Testing User Registration...');
  try {
    const userData = {
      email: `test${Date.now()}@bambosey.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890'
    };
    
    const response = await api.post('/auth/register', userData);
    console.log('✅ Registration:', response.data.message);
    authToken = response.data.accessToken;
    return response.data;
  } catch (error) {
    console.error('❌ Registration Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUserLogin() {
  console.log('🔐 Testing User Login...');
  try {
    const loginData = {
      email: 'admin@ecommerce.com',
      password: 'admin123'
    };
    
    const response = await api.post('/auth/login', loginData);
    console.log('✅ Login:', response.data.message);
    authToken = response.data.accessToken;
    return response.data;
  } catch (error) {
    console.error('❌ Login Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetProducts() {
  console.log('🛍️ Testing Get Products...');
  try {
    const response = await api.get('/products?page=1&limit=5');
    console.log('✅ Products:', `Found ${response.data.products.length} products`);
    return response.data.products;
  } catch (error) {
    console.error('❌ Get Products Failed:', error.response?.data || error.message);
    return [];
  }
}

async function testGetColors() {
  console.log('🎨 Testing Get Colors...');
  try {
    const response = await api.get('/colors');
    console.log('✅ Colors:', `Found ${response.data.length} colors`);
    return response.data;
  } catch (error) {
    console.error('❌ Get Colors Failed:', error.response?.data || error.message);
    return [];
  }
}

async function testAddToCart() {
  console.log('🛒 Testing Add to Cart...');
  try {
    const cartData = {
      productId: 1,
      productVariantId: 1,
      quantity: 2,
      isPreorder: false
    };
    
    const response = await api.post('/cart/items', cartData);
    console.log('✅ Add to Cart:', response.data.message);
    return response.data;
  } catch (error) {
    console.error('❌ Add to Cart Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetCart() {
  console.log('🛒 Testing Get Cart...');
  try {
    const response = await api.get('/cart');
    console.log('✅ Cart:', `Found ${response.data.summary?.totalItemCount || 0} items`);
    return response.data;
  } catch (error) {
    console.error('❌ Get Cart Failed:', error.response?.data || error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Health check
  await testHealthCheck();
  
  // Authentication tests
  await testUserRegistration();
  await testUserLogin();
  
  // Product tests
  await testGetProducts();
  await testGetColors();
  
  // Cart tests (requires authentication)
  await testAddToCart();
  await testGetCart();
  
  console.log('\n✨ API Tests Completed!');
}

// Run tests if script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testUserRegistration,
  testUserLogin,
  testGetProducts,
  testGetColors,
  testAddToCart,
  testGetCart,
  runAllTests
};