const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@bambosey.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with cart
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        cart: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    const tokens = generateTokens(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@bambosey.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Login endpoint implementation...
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  // Implementation here...
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       403:
 *         description: Invalid refresh token
 */

module.exports = router;

// Step 5: Example Product Routes with Swagger
// routes/products.js (Swagger annotations example)

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with filtering and pagination
 *     description: Retrieve a list of products with optional filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name or description
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color name
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter to show only products in stock
 *       - in: query
 *         name: allowPreorder
 *         schema:
 *           type: boolean
 *         description: Filter to show only products allowing preorders
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Product'
 *                       - type: object
 *                         properties:
 *                           totalStock:
 *                             type: integer
 *                             example: 50
 *                           availableColors:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Color'
 *                           hasStock:
 *                             type: boolean
 *                             example: true
 *                           variantCount:
 *                             type: integer
 *                             example: 6
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     pages:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product details with variants
 *     description: Retrieve detailed information about a specific product including all variants
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Product'
 *                 - type: object
 *                   properties:
 *                     variantsByColor:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           color:
 *                             $ref: '#/components/schemas/Color'
 *                           sizes:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/ProductVariant'
 *                           totalStock:
 *                             type: integer
 *                           hasStock:
 *                             type: boolean
 *                     totalStock:
 *                       type: integer
 *                       example: 45
 *                     hasStock:
 *                       type: boolean
 *                       example: true
 *                     availableColors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Color'
 *                     stockSummary:
 *                       type: object
 *                       properties:
 *                         inStock:
 *                           type: boolean
 *                         totalVariants:
 *                           type: integer
 *                         availableVariants:
 *                           type: integer
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     description: Create a new product with variants
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - basePrice
 *               - variants
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium T-Shirt
 *               description:
 *                 type: string
 *                 example: High-quality cotton t-shirt
 *               basePrice:
 *                 type: number
 *                 format: decimal
 *                 example: 29.99
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               sku:
 *                 type: string
 *                 example: TSHIRT-001
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/image.jpg"]
 *               allowPreorder:
 *                 type: boolean
 *                 example: true
 *               preorderPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 25.99
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     colorId:
 *                       type: integer
 *                       example: 1
 *                     sizeId:
 *                       type: integer
 *                       example: 2
 *                     quantity:
 *                       type: integer
 *                       example: 50
 *                     price:
 *                       type: number
 *                       format: decimal
 *                       example: 29.99
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product created successfully
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */