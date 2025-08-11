const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's wishlist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            inventory: {
              select: { quantity: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add item to wishlist
router.post('/items', [
  authenticateToken,
  body('productId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.body;

    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if item is already in wishlist
    const existingItem = await prisma.wishlist.findFirst({
      where: {
        userId: req.user.id,
        productId: parseInt(productId)
      }
    });

    if (existingItem) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: req.user.id,
        productId: parseInt(productId)
      },
      include: {
        product: {
          include: {
            inventory: {
              select: { quantity: true }
            }
          }
        }
      }
    });

    res.status(201).json({ message: 'Item added to wishlist', item: wishlistItem });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
});

// Remove item from wishlist
router.delete('/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        id: parseInt(itemId),
        userId: req.user.id
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    await prisma.wishlist.delete({
      where: { id: parseInt(itemId) }
    });

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
});

// Remove by product ID (alternative endpoint)
router.delete('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await prisma.wishlist.deleteMany({
      where: {
        userId: req.user.id,
        productId: parseInt(productId)
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Item not found in wishlist' });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
});

module.exports = router;