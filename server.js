const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { specs, swaggerUi } = require('./config/swagger');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const inventoryRoutes = require('./routes/inventory');
const addressRoutes = require('./routes/addresses');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');
const adminRoutes = require('./routes/admin');
const colorRoutes = require('./routes/colors');
const preorderRoutes = require('./routes/preorders');
const findSimilar = require('./routes/findSimilar');


const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

//CORS policy
const allowedOrigins = [
  'http://localhost:3000',
  'https://main.d20y1cce0y15zp.amplifyapp.com', // admin dashboard
  'https://main.dq8m98d9dqw4r.amplifyapp.com'   // client dashboard
];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (like mobile apps or curl)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: "Bam&Bosey API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none'
  }
}));

// Redirect root to API docs for development
if (process.env.NODE_ENV === 'development') {
  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });
}

// Health check endpoints (BOTH for compatibility)
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ADD THIS: Health check endpoint for admin dashboard
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/preorders', preorderRoutes);
app.use('/api', findSimilar);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin health check available at http://localhost:${PORT}/api/health`);
  console.log(`👑 Admin dashboard can connect at http://localhost:3300`);
});
