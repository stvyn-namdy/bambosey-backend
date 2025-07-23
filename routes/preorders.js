const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Preorder:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         productId:
 *           type: integer
 *         productVariantId:
 *           type: integer
 *         quantity:
 *           type: integer
 *         price:
 *           type: number
 *         depositPaid:
 *           type: number
 *         remainingAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, READY, SHIPPED, DELIVERED, CANCELLED, EXPIRED]
 *         expectedDate:
 *           type: string
 *           format: date
 *         trackingNumber:
 *           type: string
 */

/**
 * @swagger
 * /api/preorders:
 *   post:
 *     summary: Create a new preorder
 *     tags: [Preorders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               productVariantId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               shippingAddressId:
 *                 type: integer
 *               depositAmount:
 *                 type: number
 *                 minimum: 0
 */
// Create preorder
router.post('/', [
  authenticateToken,
  body('productId').isInt().withMessage('Product ID must be a valid integer'),
  body('productVariantId').optional().isInt().withMessage('Product Variant ID must be a valid integer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddressId').optional().isInt().withMessage('Shipping Address ID must be a valid integer'),
  body('depositAmount').optional().isFloat({ min: 0 }).withMessage('Deposit amount must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { 
      productId, 
      productVariantId, 
      quantity, 
      shippingAddressId,
      depositAmount = 0
    } = req.body;

    // Get product and variant details with comprehensive validation
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        isActive: true,
        allowPreorder: true
      },
      include: {
        variants: productVariantId ? {
          where: { 
            id: parseInt(productVariantId),
            isActive: true 
          }
        } : {
          where: { isActive: true }
        },
        category: {
          select: { name: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found or preorder not allowed for this product' 
      });
    }

    // Validate product variant if specified
    if (productVariantId) {
      const variant = product.variants.find(v => v.id === parseInt(productVariantId));
      if (!variant) {
        return res.status(404).json({ 
          error: 'Product variant not found or not available for preorder' 
        });
      }
    }

    // Check preorder availability window
    if (product.expectedStockDate && new Date() > new Date(product.expectedStockDate)) {
      return res.status(400).json({ 
        error: 'Preorder window has closed for this product' 
      });
    }

    // Check preorder limit
    if (product.preorderLimit) {
      const existingPreorders = await prisma.preorder.aggregate({
        where: {
          productId: parseInt(productId),
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        _sum: {
          quantity: true
        }
      });

      const currentPreorderQuantity = existingPreorders._sum.quantity || 0;
      
      if (currentPreorderQuantity + quantity > product.preorderLimit) {
        return res.status(400).json({ 
          error: `Preorder limit exceeded. Only ${product.preorderLimit - currentPreorderQuantity} items available for preorder`,
          available: product.preorderLimit - currentPreorderQuantity,
          requested: quantity
        });
      }
    }

    // Check for duplicate preorder by same user
    const existingUserPreorder = await prisma.preorder.findFirst({
      where: {
        userId: req.user.id,
        productId: parseInt(productId),
        productVariantId: productVariantId ? parseInt(productVariantId) : null,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (existingUserPreorder) {
      return res.status(400).json({ 
        error: 'You already have an active preorder for this product/variant',
        existingPreorderId: existingUserPreorder.id
      });
    }

    // Validate shipping address if provided
    if (shippingAddressId) {
      const shippingAddress = await prisma.address.findFirst({
        where: {
          id: parseInt(shippingAddressId),
          userId: req.user.id
        }
      });

      if (!shippingAddress) {
        return res.status(404).json({ 
          error: 'Shipping address not found or not accessible' 
        });
      }
    }

    // Calculate pricing
    const price = product.preorderPrice || product.basePrice;
    const totalAmount = price * quantity;
    const deposit = Math.min(depositAmount, totalAmount); // Cannot exceed total
    const remaining = totalAmount - deposit;

    // Create preorder with transaction for data integrity
    const preorder = await prisma.$transaction(async (tx) => {
      const newPreorder = await tx.preorder.create({
        data: {
          userId: req.user.id,
          productId: parseInt(productId),
          productVariantId: productVariantId ? parseInt(productVariantId) : null,
          quantity,
          price,
          shippingAddressId: shippingAddressId ? parseInt(shippingAddressId) : null,
          expectedDate: product.expectedStockDate,
          depositPaid: deposit,
          remainingAmount: remaining,
          status: deposit > 0 ? 'CONFIRMED' : 'PENDING',
          metadata: {
            productName: product.name,
            categoryName: product.category?.name,
            createdByIP: req.ip,
            userAgent: req.get('User-Agent')
          }
        },
        include: {
          product: {
            select: { 
              name: true, 
              images: true,
              expectedStockDate: true,
              preorderPrice: true,
              basePrice: true
            }
          },
          productVariant: {
            include: {
              color: true,
              size: true
            }
          },
          shippingAddress: true
        }
      });

      // Update product preorder statistics
      await tx.product.update({
        where: { id: parseInt(productId) },
        data: {
          totalPreorders: {
            increment: quantity
          }
        }
      });

      return newPreorder;
    });

    // TODO: Send confirmation email
    console.log(`Preorder created: ${preorder.id} for user ${req.user.id}`);

    res.status(201).json({ 
      message: 'Preorder created successfully', 
      preorder,
      summary: {
        totalAmount,
        depositPaid: deposit,
        remainingAmount: remaining,
        expectedDelivery: product.expectedStockDate
      }
    });
  } catch (error) {
    console.error('Error creating preorder:', error);
    res.status(500).json({ 
      error: 'Failed to create preorder',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/preorders:
 *   get:
 *     summary: Get user's preorders with filtering and pagination
 *     tags: [Preorders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, READY, SHIPPED, DELIVERED, CANCELLED, EXPIRED]
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 */
// Get user's preorders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, productId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build where clause with filters
    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(productId && { productId: parseInt(productId) })
    };

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [preorders, total, statusCounts] = await Promise.all([
      prisma.preorder.findMany({
        where,
        include: {
          product: {
            select: { 
              name: true, 
              images: true,
              expectedStockDate: true,
              basePrice: true,
              preorderPrice: true,
              category: {
                select: { name: true }
              }
            }
          },
          productVariant: {
            include: {
              color: true,
              size: true
            }
          },
          shippingAddress: true
        },
        orderBy,
        skip,
        take
      }),
      prisma.preorder.count({ where }),
      // Get status distribution for user's preorders
      prisma.preorder.groupBy({
        by: ['status'],
        where: { userId: req.user.id },
        _count: {
          status: true
        }
      })
    ]);

    // Calculate summary statistics
    const totalValue = preorders.reduce((sum, preorder) => {
      return sum + (preorder.price * preorder.quantity);
    }, 0);

    const totalDepositPaid = preorders.reduce((sum, preorder) => {
      return sum + preorder.depositPaid;
    }, 0);

    res.json({
      preorders: preorders.map(preorder => ({
        ...preorder,
        totalAmount: preorder.price * preorder.quantity,
        isOverdue: preorder.expectedDate && new Date() > new Date(preorder.expectedDate),
        daysUntilExpected: preorder.expectedDate ? 
          Math.ceil((new Date(preorder.expectedDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        pages: Math.ceil(total / take)
      },
      summary: {
        totalPreorders: total,
        totalValue,
        totalDepositPaid,
        remainingAmount: totalValue - totalDepositPaid,
        statusDistribution: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {})
      },
      filters: {
        applied: {
          status,
          productId: productId ? parseInt(productId) : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching preorders:', error);
    res.status(500).json({ error: 'Failed to fetch preorders' });
  }
});

/**
 * @swagger
 * /api/preorders/admin/all:
 *   get:
 *     summary: Get all preorders (Admin only)
 *     tags: [Preorders, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 */
// Get all preorders (Admin only) - MUST BE BEFORE /:id routes
router.get('/admin/all', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      productId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;
    
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build comprehensive where clause
    const where = {
      ...(status && { status }),
      ...(productId && { productId: parseInt(productId) }),
      ...(search && {
        OR: [
          { 
            user: { 
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          },
          { product: { name: { contains: search, mode: 'insensitive' } } }
        ]
      }),
      ...(dateFrom && {
        createdAt: {
          gte: new Date(dateFrom)
        }
      }),
      ...(dateTo && {
        createdAt: {
          ...where.createdAt,
          lte: new Date(dateTo)
        }
      })
    };

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [preorders, total, analytics] = await Promise.all([
      prisma.preorder.findMany({
        where,
        include: {
          user: {
            select: { 
              id: true,
              email: true, 
              firstName: true, 
              lastName: true,
              phone: true
            }
          },
          product: {
            select: { 
              name: true, 
              sku: true,
              images: true,
              basePrice: true,
              preorderPrice: true,
              category: {
                select: { name: true }
              }
            }
          },
          productVariant: {
            include: {
              color: true,
              size: true
            }
          },
          shippingAddress: true
        },
        orderBy,
        skip,
        take
      }),
      prisma.preorder.count({ where }),
      // Get comprehensive analytics
      Promise.all([
        prisma.preorder.groupBy({
          by: ['status'],
          _count: { status: true },
          _sum: { 
            quantity: true,
            depositPaid: true 
          }
        }),
        prisma.preorder.aggregate({
          _sum: {
            quantity: true,
            depositPaid: true
          },
          _avg: {
            price: true
          },
          _count: {
            id: true
          }
        })
      ])
    ]);

    const [statusAnalytics, overallAnalytics] = analytics;

    // Enhanced preorder data with calculations
    const enhancedPreorders = preorders.map(preorder => ({
      ...preorder,
      totalAmount: preorder.price * preorder.quantity,
      isOverdue: preorder.expectedDate && new Date() > new Date(preorder.expectedDate),
      daysUntilExpected: preorder.expectedDate ? 
        Math.ceil((new Date(preorder.expectedDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      customerInfo: {
        name: `${preorder.user.firstName} ${preorder.user.lastName}`,
        email: preorder.user.email,
        phone: preorder.user.phone
      }
    }));

    res.json({
      preorders: enhancedPreorders,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        pages: Math.ceil(total / take)
      },
      analytics: {
        overall: {
          totalPreorders: overallAnalytics._count.id,
          totalQuantity: overallAnalytics._sum.quantity || 0,
          totalDeposits: overallAnalytics._sum.depositPaid || 0,
          averagePrice: overallAnalytics._avg.price || 0
        },
        byStatus: statusAnalytics.reduce((acc, item) => {
          acc[item.status] = {
            count: item._count.status,
            totalQuantity: item._sum.quantity || 0,
            totalDeposits: item._sum.depositPaid || 0
          };
          return acc;
        }, {})
      },
      filters: {
        applied: {
          status,
          search,
          productId: productId ? parseInt(productId) : null,
          dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin preorders:', error);
    res.status(500).json({ error: 'Failed to fetch preorders' });
  }
});

/**
 * @swagger
 * /api/preorders/{id}/cancel:
 *   put:
 *     summary: Cancel a preorder
 *     tags: [Preorders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
// Cancel preorder - SPECIFIC ROUTE BEFORE /:id
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const preorder = await prisma.preorder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    if (!preorder) {
      return res.status(404).json({ error: 'Preorder not found' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(preorder.status)) {
      return res.status(400).json({ 
        error: 'Preorder cannot be cancelled',
        currentStatus: preorder.status,
        cancellableStatuses: ['PENDING', 'CONFIRMED']
      });
    }

    // Use transaction for cancellation
    const result = await prisma.$transaction(async (tx) => {
      const updatedPreorder = await tx.preorder.update({
        where: { id: parseInt(id) },
        data: { 
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason || 'Cancelled by customer',
          metadata: {
            ...preorder.metadata,
            cancelledByUser: true,
            cancellationIP: req.ip
          }
        },
        include: {
          product: {
            select: { name: true }
          },
          productVariant: {
            include: {
              color: true,
              size: true
            }
          }
        }
      });

      // Update product preorder statistics
      await tx.product.update({
        where: { id: preorder.productId },
        data: {
          totalPreorders: {
            decrement: preorder.quantity
          }
        }
      });

      return updatedPreorder;
    });

    // TODO: Process refund if deposit was paid
    if (preorder.depositPaid > 0) {
      console.log(`Refund needed for preorder ${id}: $${preorder.depositPaid}`);
      // Implement refund logic here
    }

    res.json({ 
      message: 'Preorder cancelled successfully', 
      preorder: result,
      refundInfo: preorder.depositPaid > 0 ? {
        amount: preorder.depositPaid,
        status: 'PENDING_REFUND',
        estimatedDays: 5-7
      } : null
    });
  } catch (error) {
    console.error('Error cancelling preorder:', error);
    res.status(500).json({ error: 'Failed to cancel preorder' });
  }
});

/**
 * @swagger
 * /api/preorders/{id}/status:
 *   put:
 *     summary: Update preorder status (Admin only)
 *     tags: [Preorders, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, READY, SHIPPED, DELIVERED, CANCELLED, EXPIRED]
 *               trackingNumber:
 *                 type: string
 *               notes:
 *                 type: string
 */
// Update preorder status (Admin only) - SPECIFIC ROUTE BEFORE /:id
router.put('/:id/status', [
  authenticateToken,
  requireAdmin,
  body('status').isIn(['PENDING', 'CONFIRMED', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED'])
    .withMessage('Invalid status value'),
  body('trackingNumber').optional().isLength({ min: 3 }).withMessage('Tracking number must be at least 3 characters'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;

    // Get current preorder
    const currentPreorder = await prisma.preorder.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        },
        product: {
          select: { name: true }
        }
      }
    });

    if (!currentPreorder) {
      return res.status(404).json({ error: 'Preorder not found' });
    }

    // Validate status transitions
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
      CONFIRMED: ['READY', 'CANCELLED'],
      READY: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
      EXPIRED: []
    };

    if (!validTransitions[currentPreorder.status].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status transition',
        currentStatus: currentPreorder.status,
        requestedStatus: status,
        validTransitions: validTransitions[currentPreorder.status]
      });
    }

    const updateData = { 
      status,
      updatedBy: req.user.id,
      ...(trackingNumber && { trackingNumber }),
      ...(notes && { adminNotes: notes }),
      ...(status === 'SHIPPED' && { shippedAt: new Date() }),
      ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      ...(status === 'CANCELLED' && { cancelledAt: new Date() })
    };

    const preorder = await prisma.preorder.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        },
        product: {
          select: { name: true }
        },
        productVariant: {
          include: {
            color: true,
            size: true
          }
        }
      }
    });

    // Create status history record
    await prisma.preorderStatusHistory.create({
      data: {
        preorderId: parseInt(id),
        fromStatus: currentPreorder.status,
        toStatus: status,
        changedBy: req.user.id,
        notes: notes || `Status changed from ${currentPreorder.status} to ${status}`,
        timestamp: new Date()
      }
    });

    // TODO: Send notification email to customer
    console.log(`Preorder ${id} status updated to ${status} for user ${preorder.user.email}`);

    res.json({ 
      message: 'Preorder status updated successfully', 
      preorder,
      statusChange: {
        from: currentPreorder.status,
        to: status,
        updatedBy: req.user.id,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating preorder status:', error);
    res.status(500).json({ error: 'Failed to update preorder status' });
  }
});

/**
 * @swagger
 * /api/preorders/{id}:
 *   get:
 *     summary: Get specific preorder details
 *     tags: [Preorders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
// Get specific preorder - MUST BE LAST AMONG /:id ROUTES
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const preorder = await prisma.preorder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      include: {
        product: {
          include: {
            category: {
              select: { name: true }
            }
          }
        },
        productVariant: {
          include: {
            color: true,
            size: true
          }
        },
        shippingAddress: true,
        statusHistory: {
          include: {
            changedByUser: {
              select: { firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!preorder) {
      return res.status(404).json({ error: 'Preorder not found' });
    }

    // Calculate additional metrics
    const totalAmount = preorder.price * preorder.quantity;
    const isOverdue = preorder.expectedDate && new Date() > new Date(preorder.expectedDate);
    const daysUntilExpected = preorder.expectedDate ? 
      Math.ceil((new Date(preorder.expectedDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    res.json({
      ...preorder,
      calculations: {
        totalAmount,
        isOverdue,
        daysUntilExpected,
        remainingBalance: preorder.remainingAmount,
        depositPercentage: totalAmount > 0 ? Math.round((preorder.depositPaid / totalAmount) * 100) : 0
      },
      timeline: preorder.statusHistory || []
    });
  } catch (error) {
    console.error('Error fetching preorder:', error);
    res.status(500).json({ error: 'Failed to fetch preorder' });
  }
});

module.exports = router;