const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Check product availability
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findUnique({
      where: { productId: parseInt(productId) },
      include: {
        product: {
          select: { name: true, isActive: true }
        }
      }
    });

    if (!inventory || !inventory.product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      productId: inventory.productId,
      productName: inventory.product.name,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
      isLowStock: inventory.quantity <= inventory.lowStockThreshold,
      isInStock: inventory.quantity > 0
    });
  } catch (error) {
    console.error('Error checking inventory:', error);
    res.status(500).json({ error: 'Failed to check inventory' });
  }
});

// Update inventory levels (Admin only)
router.put('/:productId', [
  authenticateToken,
  requireAdmin,
  body('quantity').isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const { quantity, lowStockThreshold } = req.body;

    const inventory = await prisma.inventory.upsert({
      where: { productId: parseInt(productId) },
      update: {
        quantity,
        ...(lowStockThreshold !== undefined && { lowStockThreshold })
      },
      create: {
        productId: parseInt(productId),
        quantity,
        lowStockThreshold: lowStockThreshold || 10
      },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    res.json({ message: 'Inventory updated successfully', inventory });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// Get low stock alerts (Admin only)
router.get('/low-stock', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.lowStockThreshold
        }
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true }
        }
      },
      orderBy: { quantity: 'asc' }
    });

    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

module.exports = router;