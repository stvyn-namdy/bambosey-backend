const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
};

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: Create an order from the user's cart items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddressId
 *               - paymentMethod
 *             properties:
 *               shippingAddressId:
 *                 type: integer
 *                 example: 1
 *               billingAddressId:
 *                 type: integer
 *                 example: 1
 *               paymentMethod:
 *                 type: string
 *                 example: stripe
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       401:
 *         description: Unauthorized
 */
// Create new order
router.post('/', [
  authenticateToken,
  body('shippingAddressId').isInt(),
  body('billingAddressId').optional().isInt(),
  body('paymentMethod').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shippingAddressId, billingAddressId, paymentMethod } = req.body;

    // Get user's cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: true,
            productVariant: {
              include: {
                inventory: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Separate regular items and preorders
    const regularItems = cart.items.filter(item => !item.isPreorder);
    const preorderItems = cart.items.filter(item => item.isPreorder);

    // Verify stock availability for regular items
    for (const item of regularItems) {
      if (item.productVariant && item.productVariant.inventory.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.product.name}` 
        });
      }
    }

    // Calculate total amount
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Determine order type
    const orderType = preorderItems.length > 0 ? 'PREORDER' : 'REGULAR';

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          orderNumber: generateOrderNumber(),
          totalAmount,
          shippingAddressId: parseInt(shippingAddressId),
          billingAddressId: billingAddressId ? parseInt(billingAddressId) : parseInt(shippingAddressId),
          paymentMethod,
          orderType,
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              isPreorder: item.isPreorder
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: {
                include: {
                  color: true,
                  size: true
                }
              }
            }
          },
          shippingAddress: true,
          billingAddress: true
        }
      });

      // Update inventory for regular items only
      for (const item of regularItems) {
        if (item.productVariant) {
          await tx.inventory.update({
            where: { productVariantId: item.productVariantId },
            data: {
              quantity: {
                decrement: item.quantity
              }
            }
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return newOrder;
    });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's order history
 *     description: Retrieve a paginated list of the user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 */
// Get user's order history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user.id },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true }
              },
              productVariant: {
                include: {
                  color: true,
                  size: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get specific order details
 *     description: Retrieve detailed information about a specific order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
// Get specific order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: {
              include: {
                color: true,
                size: true
              }
            }
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Cancel order
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      include: {
        items: {
          include: {
            productVariant: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Update order status and restore inventory
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: parseInt(id) },
        data: { status: 'CANCELLED' }
      });

      // Restore inventory for regular items only
      for (const item of order.items) {
        if (!item.isPreorder && item.productVariant) {
          await tx.inventory.update({
            where: { productVariantId: item.productVariantId },
            data: {
              quantity: {
                increment: item.quantity
              }
            }
          });
        }
      }
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get order status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        orderType: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// Update order status (Admin only)
router.put('/:id/status', [
  authenticateToken,
  requireAdmin,
  body('status').isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        items: {
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
        }
      }
    });

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;