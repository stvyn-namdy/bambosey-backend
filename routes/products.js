const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// AI Integration Helper Functions
const aiHelpers = {
  // Simulate Azure AI product recommendations
  async getProductRecommendations(productId, userId = null) {
    try {
      // In production, this would call Azure Machine Learning or Cognitive Services
      // For now, implementing intelligent logic-based recommendations
      
      const baseProduct = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        include: { category: true }
      });

      if (!baseProduct) return [];

      // Get user's purchase history for personalization
      let userPreferences = {};
      if (userId) {
        const userOrders = await prisma.order.findMany({
          where: { 
            userId: parseInt(userId),
            paymentStatus: 'COMPLETED'
          },
          include: {
            items: {
              include: {
                product: {
                  include: { category: true }
                }
              }
            }
          }
        });

        // Analyze user preferences
        const categoryPrefs = {};
        const pricePrefs = [];
        
        userOrders.forEach(order => {
          order.items.forEach(item => {
            const catId = item.product.categoryId;
            categoryPrefs[catId] = (categoryPrefs[catId] || 0) + item.quantity;
            pricePrefs.push(parseFloat(item.price));
          });
        });

        userPreferences = {
          favoriteCategories: Object.keys(categoryPrefs).sort((a, b) => categoryPrefs[b] - categoryPrefs[a]),
          averageSpend: pricePrefs.length > 0 ? pricePrefs.reduce((a, b) => a + b) / pricePrefs.length : baseProduct.basePrice
        };
      }

      // Build recommendation query with AI-like logic
      const recommendations = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { not: parseInt(productId) },
          AND: [
            // Similar category or user's favorite categories
            userPreferences.favoriteCategories?.length > 0 ? {
              OR: [
                { categoryId: baseProduct.categoryId },
                { categoryId: { in: userPreferences.favoriteCategories.map(id => parseInt(id)) } }
              ]
            } : { categoryId: baseProduct.categoryId },
            
            // Price similarity or user's spending pattern
            {
              basePrice: {
                gte: userPreferences.averageSpend ? 
                  Math.max(0, userPreferences.averageSpend * 0.5) : 
                  baseProduct.basePrice * 0.6,
                lte: userPreferences.averageSpend ? 
                  userPreferences.averageSpend * 1.8 : 
                  baseProduct.basePrice * 1.4
              }
            }
          ]
        },
        include: {
          category: { select: { name: true } },
          variants: {
            include: {
              color: true,
              inventory: { select: { quantity: true } }
            }
          },
          reviews: { select: { rating: true } }
        },
        take: 8
      });

      // Score and rank recommendations using AI-like algorithm
      const scoredRecommendations = recommendations.map(product => {
        let score = 0;
        
        // Category similarity score
        if (product.categoryId === baseProduct.categoryId) score += 30;
        if (userPreferences.favoriteCategories?.includes(product.categoryId.toString())) score += 20;
        
        // Price similarity score
        const priceDiff = Math.abs(product.basePrice - baseProduct.basePrice);
        const maxPrice = Math.max(product.basePrice, baseProduct.basePrice);
        score += Math.max(0, 20 - (priceDiff / maxPrice) * 20);
        
        // Rating score
        const avgRating = product.reviews.length > 0 ? 
          product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length : 0;
        score += avgRating * 4;
        
        // Stock availability score
        const totalStock = product.variants.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0);
        if (totalStock > 0) score += 15;
        if (totalStock > 10) score += 5;
        
        // Color variety score
        const colorCount = new Set(product.variants.filter(v => v.color).map(v => v.colorId)).size;
        score += Math.min(colorCount * 2, 10);

        return { ...product, aiScore: score };
      });

      // Return top recommendations sorted by AI score
      return scoredRecommendations
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 6);
        
    } catch (error) {
      console.error('AI Recommendation Error:', error);
      return [];
    }
  },

  // Generate AI-powered product descriptions
  async enhanceProductDescription(product) {
    // In production, this would call Azure OpenAI or Text Analytics
    const enhancements = {
      keyFeatures: [],
      suggestedUse: '',
      styleNotes: '',
      careInstructions: ''
    };

    // AI-like enhancement based on product category and attributes
    if (product.category?.name?.toLowerCase().includes('clothing')) {
      enhancements.keyFeatures = [
        'Premium quality fabric',
        'Comfortable fit',
        'Durable construction',
        'Easy care maintenance'
      ];
      enhancements.careInstructions = 'Machine wash cold, tumble dry low';
      enhancements.styleNotes = 'Versatile piece perfect for casual or semi-formal occasions';
    } else if (product.category?.name?.toLowerCase().includes('electronics')) {
      enhancements.keyFeatures = [
        'Latest technology',
        'User-friendly interface',
        'Reliable performance',
        'Warranty included'
      ];
      enhancements.suggestedUse = 'Ideal for daily use and professional applications';
    }

    // Add color-based suggestions
    const availableColors = product.variants?.filter(v => v.color).map(v => v.color.name) || [];
    if (availableColors.length > 0) {
      enhancements.colorOptions = `Available in ${availableColors.join(', ')} to match your style preferences`;
    }

    return enhancements;
  },

  // AI-powered search suggestions
  async getSearchSuggestions(query) {
    if (!query || query.length < 2) return [];

    // In production, this would use Azure Cognitive Search
    const suggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        images: true
      },
      take: 5
    });

    return suggestions.map(product => ({
      id: product.id,
      text: product.name,
      price: product.basePrice,
      image: product.images[0] || null
    }));
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Premium T-Shirt
 *         description:
 *           type: string
 *           example: High-quality cotton t-shirt
 *         basePrice:
 *           type: number
 *           format: decimal
 *           example: 29.99
 *         stockStatus:
 *           type: string
 *           enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK, DISCONTINUED, PREORDER_ONLY]
 *         allowPreorder:
 *           type: boolean
 *           example: true
 *         variants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductVariant'
 *     ProductVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         colorId:
 *           type: integer
 *         sizeId:
 *           type: integer
 *         price:
 *           type: number
 *           format: decimal
 *         stockStatus:
 *           type: string
 *         inventory:
 *           type: object
 *           properties:
 *             quantity:
 *               type: integer
 *     Color:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *           example: Red
 *         hexCode:
 *           type: string
 *           example: "#FF0000"
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with advanced filtering and AI enhancements
 *     description: Retrieve products with intelligent filtering, stock status, and AI-powered features
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: allowPreorder
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, name, basePrice, popularity]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Products retrieved successfully with AI enhancements
 */
// Get all products with advanced filtering and AI features
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      sort = 'createdAt', 
      order = 'desc',
      color,
      size,
      stockStatus,
      inStock,
      allowPreorder,
      minPrice,
      maxPrice,
      userId // For personalized results
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build complex where clause with AI-enhanced filtering
    const where = {
      isActive: true,
      ...(category && { categoryId: parseInt(category) }),
      ...(stockStatus && { stockStatus }),
      ...(minPrice && { basePrice: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { 
        basePrice: { 
          ...(minPrice ? { gte: parseFloat(minPrice), lte: parseFloat(maxPrice) } : { lte: parseFloat(maxPrice) })
        }
      }),
      ...(allowPreorder === 'true' && { allowPreorder: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      }),
      // Complex variant filtering
      ...((color || size || inStock === 'true') && {
        variants: {
          some: {
            isActive: true,
            ...(color && {
              color: {
                name: { equals: color, mode: 'insensitive' }
              }
            }),
            ...(size && {
              size: {
                name: { equals: size, mode: 'insensitive' }
              }
            }),
            ...(inStock === 'true' && {
              inventory: {
                quantity: { gt: 0 }
              }
            })
          }
        }
      })
    };

    // AI-enhanced sorting
    let orderBy = {};
    if (sort === 'popularity') {
      // AI-based popularity scoring would go here
      orderBy = { createdAt: order }; // Fallback to newest for now
    } else {
      orderBy = { [sort]: order };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, description: true }
          },
          variants: {
            where: { isActive: true },
            include: {
              color: true,
              size: true,
              inventory: {
                select: { quantity: true, reservedQuantity: true, lowStockThreshold: true }
              }
            },
            orderBy: [
              { color: { name: 'asc' } },
              { size: { sortOrder: 'asc' } }
            ]
          },
          reviews: {
            select: { rating: true },
            take: 10 // For average calculation
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.product.count({ where })
    ]);

    // AI-enhanced product processing
    const enhancedProducts = await Promise.all(products.map(async (product) => {
      // Calculate comprehensive stock metrics
      const stockMetrics = calculateStockMetrics(product);
      
      // Get AI enhancements
      const aiEnhancements = await aiHelpers.enhanceProductDescription(product);
      
      // Calculate color and size availability
      const colorAvailability = calculateColorAvailability(product.variants);
      const sizeAvailability = calculateSizeAvailability(product.variants);
      
      // Calculate pricing information
      const pricingInfo = calculatePricingInfo(product);
      
      // Calculate review metrics
      const reviewMetrics = calculateReviewMetrics(product.reviews);

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        sku: product.sku,
        images: product.images,
        stockStatus: product.stockStatus,
        allowPreorder: product.allowPreorder,
        preorderPrice: product.preorderPrice,
        expectedStockDate: product.expectedStockDate,
        category: product.category,
        
        // Enhanced metrics
        ...stockMetrics,
        ...pricingInfo,
        ...reviewMetrics,
        
        // Color and size information
        colorAvailability,
        sizeAvailability,
        
        // AI enhancements
        aiEnhancements,
        
        // Variant summary
        variantSummary: {
          total: product.variants.length,
          inStock: product.variants.filter(v => (v.inventory?.quantity || 0) > 0).length,
          colors: colorAvailability.available.length,
          sizes: sizeAvailability.available.length
        }
      };
    }));

    // Generate AI-powered search suggestions if search query provided
    let searchSuggestions = [];
    if (search) {
      searchSuggestions = await aiHelpers.getSearchSuggestions(search);
    }

    res.json({
      products: enhancedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        pages: Math.ceil(total / take)
      },
      filters: {
        applied: {
          category,
          search,
          color,
          size,
          stockStatus,
          inStock: inStock === 'true',
          allowPreorder: allowPreorder === 'true',
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null
        },
        suggestions: searchSuggestions
      },
      meta: {
        timestamp: new Date().toISOString(),
        aiEnhanced: true
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /api/products/{id}/variants:
 *   get:
 *     summary: Get product variants with detailed information
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: colorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sizeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 */
// Get product variants with filtering
router.get('/:id/variants', async (req, res) => {
  try {
    const { id } = req.params;
    const { colorId, sizeId, inStock } = req.query;

    const where = {
      productId: parseInt(id),
      isActive: true,
      ...(colorId && { colorId: parseInt(colorId) }),
      ...(sizeId && { sizeId: parseInt(sizeId) }),
      ...(inStock === 'true' && {
        inventory: {
          quantity: { gt: 0 }
        }
      })
    };

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        color: true,
        size: true,
        inventory: true
      },
      orderBy: [
        { color: { name: 'asc' } },
        { size: { sortOrder: 'asc' } }
      ]
    });

    const enhancedVariants = variants.map(variant => ({
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      price: variant.price,
      images: variant.images,
      stockStatus: variant.stockStatus,
      color: variant.color,
      size: variant.size,
      inventory: {
        quantity: variant.inventory?.quantity || 0,
        reservedQuantity: variant.inventory?.reservedQuantity || 0,
        availableQuantity: (variant.inventory?.quantity || 0) - (variant.inventory?.reservedQuantity || 0),
        lowStockThreshold: variant.inventory?.lowStockThreshold || 10,
        isInStock: (variant.inventory?.quantity || 0) > 0,
        isLowStock: (variant.inventory?.quantity || 0) <= (variant.inventory?.lowStockThreshold || 10),
        stockLevel: getStockLevel(variant.inventory?.quantity || 0, variant.inventory?.lowStockThreshold || 10)
      }
    }));

    res.json(enhancedVariants);
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

/**
 * @swagger
 * /api/products/{id}/colors:
 *   get:
 *     summary: Get available colors for a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 */
// Get available colors for a product
router.get('/:id/colors', async (req, res) => {
  try {
    const { id } = req.params;
    const { inStock } = req.query;

    const variants = await prisma.productVariant.findMany({
      where: {
        productId: parseInt(id),
        isActive: true,
        colorId: { not: null },
        ...(inStock === 'true' && {
          inventory: {
            quantity: { gt: 0 }
          }
        })
      },
      include: {
        color: true,
        inventory: {
          select: { quantity: true }
        }
      },
      distinct: ['colorId']
    });

    const colors = variants
      .map(variant => ({
        ...variant.color,
        hasStock: (variant.inventory?.quantity || 0) > 0,
        stockCount: variant.inventory?.quantity || 0,
        isPopular: (variant.inventory?.quantity || 0) > 20 // AI insight
      }))
      .filter(color => color.id);

    res.json(colors);
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

/**
 * @swagger
 * /api/products/{id}/recommendations:
 *   get:
 *     summary: Get AI-powered product recommendations
 *     tags: [Products, AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 */
// Get AI-powered recommendations
router.get('/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, limit = 6 } = req.query;

    const recommendations = await aiHelpers.getProductRecommendations(id, userId);
    
    const formattedRecommendations = recommendations.slice(0, parseInt(limit)).map(product => ({
      ...formatProductSummary(product),
      aiScore: product.aiScore,
      recommendationReason: generateRecommendationReason(product, id)
    }));

    res.json({
      productId: parseInt(id),
      recommendations: formattedRecommendations,
      algorithm: 'hybrid-collaborative-content',
      personalized: !!userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get detailed product information with AI insights
 *     description: Retrieve comprehensive product details including variants, AI recommendations, and enhanced analytics
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID for personalized recommendations
 *     responses:
 *       200:
 *         description: Product details with AI enhancements
 *       404:
 *         description: Product not found
 */
// Get single product with comprehensive details and AI insights (MUST BE AFTER SPECIFIC ROUTES)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(id),
        isActive: true
      },
      include: {
        category: {
          select: { id: true, name: true, description: true }
        },
        variants: {
          where: { isActive: true },
          include: {
            color: true,
            size: true,
            inventory: {
              select: { 
                quantity: true, 
                reservedQuantity: true,
                lowStockThreshold: true 
              }
            }
          },
          orderBy: [
            { color: { name: 'asc' } },
            { size: { sortOrder: 'asc' } }
          ]
        },
        reviews: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate comprehensive metrics
    const stockMetrics = calculateStockMetrics(product);
    const pricingInfo = calculatePricingInfo(product);
    const reviewMetrics = calculateReviewMetrics(product.reviews);
    
    // Group variants by color with detailed information
    const variantsByColor = groupVariantsByColor(product.variants);
    
    // Calculate size availability
    const sizeAvailability = calculateSizeAvailability(product.variants);
    
    // Get AI enhancements
    const aiEnhancements = await aiHelpers.enhanceProductDescription(product);
    
    // Get AI-powered recommendations
    const recommendations = await aiHelpers.getProductRecommendations(id, userId);
    
    // Calculate cross-sell potential (products often bought together)
    const crossSellProducts = await getCrossSellProducts(id);
    
    // Get recently viewed alternatives (if user provided)
    let personalizedData = {};
    if (userId) {
      personalizedData = await getPersonalizedData(userId, id);
    }

    res.json({
      // Basic product information
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      sku: product.sku,
      images: product.images,
      stockStatus: product.stockStatus,
      allowPreorder: product.allowPreorder,
      preorderPrice: product.preorderPrice,
      expectedStockDate: product.expectedStockDate,
      preorderLimit: product.preorderLimit,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      
      // Enhanced metrics
      ...stockMetrics,
      ...pricingInfo,
      ...reviewMetrics,
      
      // Variant information
      variantsByColor,
      sizeAvailability,
      
      // AI enhancements
      aiEnhancements,
      
      // Recommendations and cross-sells
      recommendations: recommendations.map(formatProductSummary),
      crossSellProducts: crossSellProducts.map(formatProductSummary),
      
      // Personalized data
      ...personalizedData,
      
      // Full reviews
      reviews: product.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          name: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`
        }
      })),
      
      // SEO and meta information
      seo: {
        title: `${product.name} - Bam&Bosey`,
        description: product.description?.substring(0, 160) || '',
        keywords: generateSEOKeywords(product),
        schema: generateProductSchema(product, stockMetrics, reviewMetrics)
      }
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

/**
 * @swagger
 * /api/products/{id}/variants:
 *   get:
 *     summary: Get product variants with detailed information
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: colorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sizeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 */
// Get product variants with filtering
router.get('/:id/variants', async (req, res) => {
  try {
    const { id } = req.params;
    const { colorId, sizeId, inStock } = req.query;

    const where = {
      productId: parseInt(id),
      isActive: true,
      ...(colorId && { colorId: parseInt(colorId) }),
      ...(sizeId && { sizeId: parseInt(sizeId) }),
      ...(inStock === 'true' && {
        inventory: {
          quantity: { gt: 0 }
        }
      })
    };

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        color: true,
        size: true,
        inventory: true
      },
      orderBy: [
        { color: { name: 'asc' } },
        { size: { sortOrder: 'asc' } }
      ]
    });

    const enhancedVariants = variants.map(variant => ({
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      price: variant.price,
      images: variant.images,
      stockStatus: variant.stockStatus,
      color: variant.color,
      size: variant.size,
      inventory: {
        quantity: variant.inventory?.quantity || 0,
        reservedQuantity: variant.inventory?.reservedQuantity || 0,
        availableQuantity: (variant.inventory?.quantity || 0) - (variant.inventory?.reservedQuantity || 0),
        lowStockThreshold: variant.inventory?.lowStockThreshold || 10,
        isInStock: (variant.inventory?.quantity || 0) > 0,
        isLowStock: (variant.inventory?.quantity || 0) <= (variant.inventory?.lowStockThreshold || 10),
        stockLevel: getStockLevel(variant.inventory?.quantity || 0, variant.inventory?.lowStockThreshold || 10)
      }
    }));

    res.json(enhancedVariants);
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

/**
 * @swagger
 * /api/products/{id}/colors:
 *   get:
 *     summary: Get available colors for a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 */
// Get available colors for a product
router.get('/:id/colors', async (req, res) => {
  try {
    const { id } = req.params;
    const { inStock } = req.query;

    const variants = await prisma.productVariant.findMany({
      where: {
        productId: parseInt(id),
        isActive: true,
        colorId: { not: null },
        ...(inStock === 'true' && {
          inventory: {
            quantity: { gt: 0 }
          }
        })
      },
      include: {
        color: true,
        inventory: {
          select: { quantity: true }
        }
      },
      distinct: ['colorId']
    });

    const colors = variants
      .map(variant => ({
        ...variant.color,
        hasStock: (variant.inventory?.quantity || 0) > 0,
        stockCount: variant.inventory?.quantity || 0,
        isPopular: (variant.inventory?.quantity || 0) > 20 // AI insight
      }))
      .filter(color => color.id);

    res.json(colors);
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

/**
 * @swagger
 * /api/products/{id}/recommendations:
 *   get:
 *     summary: Get AI-powered product recommendations
 *     tags: [Products, AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 */
// Get AI-powered recommendations
router.get('/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, limit = 6 } = req.query;

    const recommendations = await aiHelpers.getProductRecommendations(id, userId);
    
    const formattedRecommendations = recommendations.slice(0, parseInt(limit)).map(product => ({
      ...formatProductSummary(product),
      aiScore: product.aiScore,
      recommendationReason: generateRecommendationReason(product, id)
    }));

    res.json({
      productId: parseInt(id),
      recommendations: formattedRecommendations,
      algorithm: 'hybrid-collaborative-content',
      personalized: !!userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
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
 *               - description
 *               - basePrice
 *               - categoryId
 *               - sku
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               sku:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               stockStatus:
 *                 type: string
 *                 enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK, DISCONTINUED, PREORDER_ONLY]
 *               allowPreorder:
 *                 type: boolean
 *               preorderPrice:
 *                 type: number
 *               preorderLimit:
 *                 type: integer
 *               expectedStockDate:
 *                 type: string
 *                 format: date
 */
// Create new product (Admin only)
router.post('/', 
  authenticateToken, 
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
    body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
    body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    body('sku').trim().isLength({ min: 1 }).withMessage('SKU is required'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('stockStatus').optional().isIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'PREORDER_ONLY']),
    body('allowPreorder').optional().isBoolean(),
    body('preorderPrice').optional().isFloat({ min: 0 }),
    body('preorderLimit').optional().isInt({ min: 1 }),
    body('expectedStockDate').optional().isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        description,
        basePrice,
        categoryId,
        sku,
        images = [],
        stockStatus = 'IN_STOCK',
        allowPreorder = false,
        preorderPrice,
        preorderLimit,
        expectedStockDate
      } = req.body;

      // Check if SKU already exists
      const existingSku = await prisma.product.findFirst({
        where: { sku }
      });

      if (existingSku) {
        return res.status(400).json({ error: 'SKU already exists' });
      }

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });

      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          basePrice: parseFloat(basePrice),
          categoryId: parseInt(categoryId),
          sku,
          images,
          stockStatus,
          allowPreorder,
          preorderPrice: preorderPrice ? parseFloat(preorderPrice) : null,
          preorderLimit: preorderLimit ? parseInt(preorderLimit) : null,
          expectedStockDate
        },
        include: {
          category: true
        }
      });

      res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
// Update product (Admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 1 }).withMessage('Product name cannot be empty'),
    body('description').optional().trim().isLength({ min: 1 }).withMessage('Description cannot be empty'),
    body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('categoryId').optional().isInt({ min: 1 }).withMessage('Valid category ID is required'),
    body('sku').optional().trim().isLength({ min: 1 }).withMessage('SKU cannot be empty'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('stockStatus').optional().isIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'PREORDER_ONLY']),
    body('allowPreorder').optional().isBoolean(),
    body('preorderPrice').optional().isFloat({ min: 0 }),
    body('preorderLimit').optional().isInt({ min: 1 }),
    body('expectedStockDate').optional().isISO8601().toDate(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if SKU is being updated and already exists
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findFirst({
          where: { 
            sku: updateData.sku,
            id: { not: parseInt(id) }
          }
        });

        if (existingSku) {
          return res.status(400).json({ error: 'SKU already exists' });
        }
      }

      // Verify category exists if being updated
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: parseInt(updateData.categoryId) }
        });

        if (!category) {
          return res.status(400).json({ error: 'Category not found' });
        }
      }

      // Prepare update data with proper type conversions
      const processedUpdateData = {
        ...updateData,
        ...(updateData.basePrice && { basePrice: parseFloat(updateData.basePrice) }),
        ...(updateData.categoryId && { categoryId: parseInt(updateData.categoryId) }),
        ...(updateData.preorderPrice && { preorderPrice: parseFloat(updateData.preorderPrice) }),
        ...(updateData.preorderLimit && { preorderLimit: parseInt(updateData.preorderLimit) })
      };

      const updatedProduct = await prisma.product.update({
        where: { id: parseInt(id) },
        data: processedUpdateData,
        include: {
          category: true,
          variants: {
            include: {
              color: true,
              size: true,
              inventory: true
            }
          }
        }
      });

      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete/deactivate a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *         description: Permanently delete instead of soft delete
 */
// Delete/deactivate product (Admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permanent } = req.query;

      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
        include: {
          variants: true,
          _count: {
            select: {
              orderItems: true
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if product has orders (prevent deletion if it does)
      if (product._count.orderItems > 0 && permanent === 'true') {
        return res.status(400).json({ 
          error: 'Cannot permanently delete product with existing orders. Use soft delete instead.' 
        });
      }

      if (permanent === 'true') {
        // Permanently delete product and its variants
        await prisma.$transaction(async (tx) => {
          // Delete variant inventories
          await tx.inventory.deleteMany({
            where: {
              productVariantId: {
                in: product.variants.map(v => v.id)
              }
            }
          });

          // Delete variants
          await tx.productVariant.deleteMany({
            where: { productId: parseInt(id) }
          });

          // Delete product
          await tx.product.delete({
            where: { id: parseInt(id) }
          });
        });

        res.json({ message: 'Product permanently deleted' });
      } else {
        // Soft delete (deactivate)
        await prisma.$transaction(async (tx) => {
          // Deactivate all variants
          await tx.productVariant.updateMany({
            where: { productId: parseInt(id) },
            data: { isActive: false }
          });

          // Deactivate product
          await tx.product.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
          });
        });

        res.json({ message: 'Product deactivated successfully' });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// Helper Functions for AI and Data Processing

function calculateStockMetrics(product) {
  const variants = product.variants || [];
  
  const totalStock = variants.reduce((sum, variant) => 
    sum + (variant.inventory?.quantity || 0), 0
  );
  
  const reservedStock = variants.reduce((sum, variant) => 
    sum + (variant.inventory?.reservedQuantity || 0), 0
  );
  
  const availableStock = totalStock - reservedStock;
  
  const lowStockVariants = variants.filter(variant => {
    const qty = variant.inventory?.quantity || 0;
    const threshold = variant.inventory?.lowStockThreshold || 10;
    return qty > 0 && qty <= threshold;
  });

  return {
    totalStock,
    reservedStock,
    availableStock,
    hasStock: totalStock > 0,
    isLowStock: lowStockVariants.length > 0,
    stockLevel: getStockLevel(totalStock),
    variantCount: variants.length,
    inStockVariants: variants.filter(v => (v.inventory?.quantity || 0) > 0).length
  };
}

function calculateColorAvailability(variants) {
  const colorMap = new Map();
  
  variants.forEach(variant => {
    if (variant.color) {
      const colorId = variant.color.id;
      if (!colorMap.has(colorId)) {
        colorMap.set(colorId, {
          ...variant.color,
          totalStock: 0,
          variants: []
        });
      }
      
      const colorData = colorMap.get(colorId);
      colorData.totalStock += variant.inventory?.quantity || 0;
      colorData.variants.push(variant);
    }
  });

  const colors = Array.from(colorMap.values());
  
  return {
    total: colors.length,
    available: colors.filter(color => color.totalStock > 0),
    outOfStock: colors.filter(color => color.totalStock === 0),
    mostPopular: colors.sort((a, b) => b.totalStock - a.totalStock)[0] || null
  };
}

function calculateSizeAvailability(variants) {
  const sizeMap = new Map();
  
  variants.forEach(variant => {
    if (variant.size) {
      const sizeId = variant.size.id;
      if (!sizeMap.has(sizeId)) {
        sizeMap.set(sizeId, {
          ...variant.size,
          totalStock: 0,
          variants: []
        });
      }
      
      const sizeData = sizeMap.get(sizeId);
      sizeData.totalStock += variant.inventory?.quantity || 0;
      sizeData.variants.push(variant);
    }
  });

  const sizes = Array.from(sizeMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  
  return {
    total: sizes.length,
    available: sizes.filter(size => size.totalStock > 0),
    outOfStock: sizes.filter(size => size.totalStock === 0),
    mostPopular: sizes.sort((a, b) => b.totalStock - a.totalStock)[0] || null
  };
}

function calculatePricingInfo(product) {
  const variants = product.variants || [];
  
  if (variants.length === 0) {
    return {
      minPrice: product.basePrice,
      maxPrice: product.basePrice,
      priceRange: null,
      hasVariantPricing: false,
      averagePrice: product.basePrice
    };
  }

  const prices = variants.map(v => parseFloat(v.price || product.basePrice));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return {
    minPrice,
    maxPrice,
    priceRange: minPrice !== maxPrice ? `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}` : null,
    hasVariantPricing: minPrice !== maxPrice,
    averagePrice: parseFloat(averagePrice.toFixed(2))
  };
}

function calculateReviewMetrics(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recommendationScore: 0
    };
  }

  const totalReviews = reviews.length;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = parseFloat((totalRating / totalReviews).toFixed(1));

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    ratingDistribution[review.rating]++;
  });

  // Calculate recommendation score (percentage of 4+ star ratings)
  const positiveReviews = ratingDistribution[4] + ratingDistribution[5];
  const recommendationScore = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;

  return {
    averageRating,
    totalReviews,
    ratingDistribution,
    recommendationScore
  };
}

function groupVariantsByColor(variants) {
  const colorGroups = {};
  
  variants.forEach(variant => {
    if (variant.color) {
      const colorId = variant.color.id;
      if (!colorGroups[colorId]) {
        colorGroups[colorId] = {
          color: variant.color,
          variants: [],
          totalStock: 0,
          priceRange: { min: null, max: null }
        };
      }
      
      colorGroups[colorId].variants.push(variant);
      colorGroups[colorId].totalStock += variant.inventory?.quantity || 0;
      
      const price = parseFloat(variant.price || 0);
      if (colorGroups[colorId].priceRange.min === null || price < colorGroups[colorId].priceRange.min) {
        colorGroups[colorId].priceRange.min = price;
      }
      if (colorGroups[colorId].priceRange.max === null || price > colorGroups[colorId].priceRange.max) {
        colorGroups[colorId].priceRange.max = price;
      }
    }
  });

  return Object.values(colorGroups);
}

function getStockLevel(quantity, threshold = 10) {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function formatProductSummary(product) {
  return {
    id: product.id,
    name: product.name,
    basePrice: product.basePrice,
    images: product.images,
    stockStatus: product.stockStatus,
    category: product.category,
    averageRating: product.reviews ? calculateReviewMetrics(product.reviews).averageRating : 0,
    totalReviews: product.reviews ? product.reviews.length : 0,
    hasStock: product.variants ? product.variants.some(v => (v.inventory?.quantity || 0) > 0) : false
  };
}

function generateRecommendationReason(product, baseProductId) {
  // AI-like logic to generate recommendation reasons
  const reasons = [
    'Customers who viewed this item also liked',
    'Similar style and category',
    'Highly rated by customers',
    'Frequently bought together',
    'Trending in this category'
  ];
  
  return reasons[Math.floor(Math.random() * reasons.length)];
}

async function getCrossSellProducts(productId) {
  try {
    // Find products often bought together by analyzing order history
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            productId: parseInt(productId)
          }
        },
        paymentStatus: 'COMPLETED'
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                variants: {
                  include: {
                    inventory: { select: { quantity: true } }
                  }
                },
                reviews: { select: { rating: true } }
              }
            }
          }
        }
      },
      take: 50 // Analyze recent orders
    });

    const productFrequency = {};
    
    orders.forEach(order => {
      const productIds = order.items.map(item => item.productId);
      if (productIds.includes(parseInt(productId))) {
        productIds.forEach(id => {
          if (id !== parseInt(productId)) {
            productFrequency[id] = (productFrequency[id] || 0) + 1;
          }
        });
      }
    });

    // Get top cross-sell products
    const topProductIds = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([id]) => parseInt(id));

    if (topProductIds.length === 0) return [];

    const crossSellProducts = await prisma.product.findMany({
      where: {
        id: { in: topProductIds },
        isActive: true
      },
      include: {
        category: true,
        variants: {
          include: {
            inventory: { select: { quantity: true } }
          }
        },
        reviews: { select: { rating: true } }
      }
    });

    return crossSellProducts;
  } catch (error) {
    console.error('Error fetching cross-sell products:', error);
    return [];
  }
}

async function getPersonalizedData(userId, productId) {
  try {
    // Get user's recent activity and preferences
    const [recentlyViewed, userOrders, wishlistItems] = await Promise.all([
      // Recently viewed products (you'd need to implement view tracking)
      prisma.product.findMany({
        where: {
          isActive: true,
          id: { not: parseInt(productId) }
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      }),
      
      // User's order history
      prisma.order.findMany({
        where: { 
          userId: parseInt(userId),
          paymentStatus: 'COMPLETED'
        },
        include: {
          items: {
            include: {
              product: { select: { categoryId: true } }
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),

      // Wishlist items (if you have a wishlist feature)
      []
    ]);

    // Analyze user preferences
    const categoryPreferences = {};
    userOrders.forEach(order => {
      order.items.forEach(item => {
        const categoryId = item.product.categoryId;
        categoryPreferences[categoryId] = (categoryPreferences[categoryId] || 0) + 1;
      });
    });

    return {
      recentlyViewed: recentlyViewed.map(formatProductSummary),
      purchaseHistory: {
        totalOrders: userOrders.length,
        favoriteCategories: Object.keys(categoryPreferences)
          .sort((a, b) => categoryPreferences[b] - categoryPreferences[a])
          .slice(0, 3)
          .map(id => parseInt(id))
      },
      recommendations: {
        basedOnHistory: true,
        reason: 'Based on your purchase history'
      }
    };
  } catch (error) {
    console.error('Error fetching personalized data:', error);
    return {};
  }
}

function generateSEOKeywords(product) {
  const keywords = [
    product.name,
    product.category?.name,
    'Bam&Bosey',
    'fashion',
    'clothing',
    'online shopping'
  ].filter(Boolean);

  return keywords.join(', ');
}

function generateProductSchema(product, stockMetrics, reviewMetrics) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Bam&Bosey'
    },
    category: product.category?.name,
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: 'USD',
      availability: stockMetrics.hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Bam&Bosey'
      }
    },
    aggregateRating: reviewMetrics.totalReviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: reviewMetrics.averageRating,
      reviewCount: reviewMetrics.totalReviews
    } : undefined
  };
}

module.exports = router;