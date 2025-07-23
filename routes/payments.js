const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Mock Stripe for development (replace with actual Stripe in production)
const mockStripe = {
  paymentIntents: {
    create: async (params) => ({
      id: 'pi_' + Math.random().toString(36).substr(2, 9),
      status: 'succeeded',
      client_secret: 'pi_' + Math.random().toString(36).substr(2, 9) + '_secret',
      amount: params.amount,
      currency: params.currency
    })
  },
  paymentMethods: {
    detach: async (id) => ({ id, object: 'payment_method', detached: true })
  },
  webhooks: {
    constructEvent: (body, sig, secret) => ({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } }
    })
  }
};

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process payment
 *     description: Process payment for an order using Stripe
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - paymentMethodId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 1
 *               paymentMethodId:
 *                 type: string
 *                 example: pm_test_card
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid request or order already paid
 *       404:
 *         description: Order not found
 */
// Process payment
router.post('/process', [
  authenticateToken,
  body('orderId').isInt(),
  body('paymentMethodId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentMethodId } = req.body;

    // Get order
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    // Create payment intent with mock Stripe (replace with real Stripe)
    const paymentIntent = await mockStripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: 'https://bambosey.com/return'
    });

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING'
      }
    });

    res.json({
      message: 'Payment processed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Handle Stripe webhooks
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = mockStripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update order payment status
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { 
            paymentStatus: 'COMPLETED',
            status: 'CONFIRMED'
          }
        });
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: failedPayment.id },
          data: { paymentStatus: 'FAILED' }
        });
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get saved payment methods
 *     description: Retrieve user's saved payment methods
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 */
// Get saved payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Save payment method
router.post('/methods', [
  authenticateToken,
  body('stripePaymentMethodId').notEmpty(),
  body('cardLastFour').isLength({ min: 4, max: 4 }),
  body('cardBrand').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stripePaymentMethodId, cardLastFour, cardBrand, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: req.user.id,
        stripePaymentMethodId,
        cardLastFour,
        cardBrand,
        isDefault: isDefault || false
      }
    });

    res.status(201).json({ message: 'Payment method saved successfully', paymentMethod });
  } catch (error) {
    console.error('Error saving payment method:', error);
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

// Delete payment method
router.delete('/methods/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Delete from mock Stripe (replace with real Stripe)
    await mockStripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

module.exports = router;