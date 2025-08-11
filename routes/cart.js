const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Add item to cart (updated to handle variants and preorders)
router.post('/items', [
  authenticateToken,
  body('productId').isInt(),
  body('productVariantId').optional().isInt(),
  body('quantity').isInt({ min: 1 }),
  body('isPreorder').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, productVariantId, quantity, isPreorder = false } = req.body;

    // Get product and variant details
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let variant = null;
    let price = product.basePrice;

    if (productVariantId) {
      variant = await prisma.productVariant.findFirst({
        where: {
          id: parseInt(productVariantId),
          productId: parseInt(productId),
          isActive: true
        },
        include: {
          inventory: true,
          color: true,
          size: true
        }
      });

      if (!variant) {
        return res.status(404).json({ error: 'Product variant not found' });
      }

      price = variant.price || product.basePrice;

      // Check stock availability for regular orders
      if (!isPreorder && variant.inventory.quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
    }

    // For preorders, check if product allows preorders
    if (isPreorder) {
      if (!product.allowPreorder) {
        return res.status(400).json({ error: 'Preorders not allowed for this product' });
      }
      price = product.preorderPrice || price;
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id }
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: parseInt(productId),
        productVariantId: productVariantId ? parseInt(productVariantId) : null,
        isPreorder
      }
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      // Check stock for updated quantity (if not preorder)
      if (!isPreorder && variant && variant.inventory.quantity < newQuantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          productVariant: {
            include: {
              color: true,
              size: true
            }
          }
        }
      });

      res.json({ message: 'Cart updated successfully', item: updatedItem });
    } else {
      // Add new item
      const cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: parseInt(productId),
          productVariantId: productVariantId ? parseInt(productVariantId) : null,
          quantity,
          price,
          isPreorder
        },
        include: {
          product: true,
          productVariant: {
            include: {
              color: true,
              size: true
            }
          }
        }
      });

      res.status(201).json({ message: 'Item added to cart', item: cartItem });
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Get user's cart (updated to show variants and preorder info)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
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
                size: true,
                inventory: {
                  select: { quantity: true }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      // Create cart if it doesn't exist
      const newCart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: { items: true }
      });
      return res.json(newCart);
    }

    // Separate regular items and preorders
    const regularItems = cart.items.filter(item => !item.isPreorder);
    const preorderItems = cart.items.filter(item => item.isPreorder);

    // Calculate totals
    const regularSubtotal = regularItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const preorderSubtotal = preorderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalSubtotal = regularSubtotal + preorderSubtotal;
    
    const regularItemCount = regularItems.reduce((sum, item) => sum + item.quantity, 0);
    const preorderItemCount = preorderItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      ...cart,
      summary: {
        regularSubtotal,
        preorderSubtotal,
        totalSubtotal,
        regularItemCount,
        preorderItemCount,
        totalItemCount: regularItemCount + preorderItemCount
      },
      regularItems,
      preorderItems
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

module.exports = router;