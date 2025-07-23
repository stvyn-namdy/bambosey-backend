# 🛒 Bam&Bosey Complete Ecommerce Backend

Reintroducing Bam&Bosey Ecommerce Website. A comprehensive ecommerce backend API built with Node.js, Express.js, Prisma ORM, and PostgreSQL featuring product variants, colors, stock management, and preorder functionality.

## ✨ Features

### Core Features
- **User Authentication & Authorization** (JWT with refresh tokens)
- **Product Management** with variants (colors, sizes)
- **Shopping Cart** with variant support
- **Order Processing** with inventory management
- **Payment Integration** (Stripe)
- **Review System** with ratings
- **Wishlist** functionality
- **Address Management** (shipping/billing)

### Advanced Features
- **Product Variants** - Colors, sizes, and variant-specific pricing
- **Stock Management** - Real-time inventory tracking with low stock alerts
- **Preorder System** - Allow customers to preorder out-of-stock items
- **Admin Dashboard** - Complete admin panel with analytics
- **Multi-level Categories** - Hierarchical product categorization
- **Search & Filtering** - Advanced product search with filters

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ecommerce-backend
npm install
```

2. **Environment Setup:**
```bash
cp .env.example .env
# Edit .env with your database and API keys
```

3. **Database Setup:**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database
npm run db:seed
```

4. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register       - User registration
POST /api/auth/login          - User login
POST /api/auth/refresh        - Refresh access token
POST /api/auth/logout         - User logout
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password  - Reset password
```

### Product Endpoints
```
GET    /api/products           - List products with filters
GET    /api/products/:id       - Get single product with variants
GET    /api/products/:id/variants - Get product variants
GET    /api/products/:id/colors  - Get available colors
GET    /api/products/search    - Search products
GET    /api/products/categories - Get categories
POST   /api/products           - Create product (Admin)
PUT    /api/products/:id       - Update product (Admin)
DELETE /api/products/:id       - Delete product (Admin)
```

### Cart Endpoints
```
GET    /api/cart               - Get user's cart
POST   /api/cart/items         - Add item to cart
PUT    /api/cart/items/:id     - Update cart item
DELETE /api/cart/items/:id     - Remove cart item
DELETE /api/cart               - Clear cart
```

### Order Endpoints
```
POST   /api/orders             - Create order
GET    /api/orders             - Get user's orders
GET    /api/orders/:id         - Get order details
PUT    /api/orders/:id/cancel  - Cancel order
GET    /api/orders/:id/status  - Get order status
```

### Preorder Endpoints
```
POST   /api/preorders          - Create preorder
GET    /api/preorders          - Get user's preorders
GET    /api/preorders/:id      - Get preorder details
PUT    /api/preorders/:id/cancel - Cancel preorder
```

### Additional Endpoints
- **Colors**: `/api/colors` - Color management
- **Inventory**: `/api/inventory` - Stock management
- **Addresses**: `/api/addresses` - Address management
- **Reviews**: `/api/reviews` - Product reviews
- **Wishlist**: `/api/wishlist` - Wishlist management
- **Payments**: `/api/payments` - Payment processing
- **Admin**: `/api/admin` - Admin dashboard and management

## 🗄️ Database Schema

### Core Models
- **User** - Customer and admin accounts
- **Product** - Main product information
- **ProductVariant** - Color/size combinations
- **Inventory** - Stock tracking per variant
- **Color** - Available colors with hex codes
- **Size** - Available sizes with ordering
- **Category** - Hierarchical categories

### Transaction Models
- **Cart/CartItem** - Shopping cart
- **Order/OrderItem** - Order processing
- **Preorder** - Preorder management
- **Review** - Product reviews
- **Wishlist** - Saved products

## 🔧 API Usage Examples

### Register a new user
```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Add product variant to cart
```javascript
POST /api/cart/items
{
  "productId": 1,
  "productVariantId": 5,
  "quantity": 2,
  "isPreorder": false
}
```

### Create a preorder
```javascript
POST /api/preorders
{
  "productId": 1,
  "productVariantId": 3,
  "quantity": 1,
  "shippingAddressId": 1,
  "depositAmount": 25.00
}
```

### Filter products by color and stock
```javascript
GET /api/products?color=Black&inStock=true&page=1&limit=10
```

## 🛡️ Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** with bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** with express-validator
- **CORS Protection** and security headers
- **Role-based Access Control** (Customer/Admin)

## 📊 Admin Features

- **Dashboard** with key metrics and analytics
- **Order Management** with status tracking
- **User Management** and account oversight
- **Inventory Control** with low stock alerts
- **Product Management** including variants
- **Preorder Management** and fulfillment
- **Sales Analytics** and reporting

## 🚀 Deployment

### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# For development
docker-compose -f docker-compose.dev.yml up -d