const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard data
router.get('/dashboard', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      lowStockProducts,
      pendingPreorders,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total active products
      prisma.product.count({
        where: { isActive: true }
      }),
      
      // Total orders
      prisma.order.count(),
      
      // Total revenue
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { totalAmount: true }
      }),
      
      // Recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }),
      
      // Low stock products
      prisma.inventory.findMany({
        where: {
          quantity: {
            lte: prisma.inventory.fields.lowStockThreshold
          }
        },
        include: {
          product: {
            select: { name: true, sku: true }
          }
        },
        take: 10
      }),

      // Pending preorders
      prisma.preorder.count({
        where: { status: 'PENDING' }
      })
    ]);

    const dashboardData = {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        pendingPreorders
      },
      recentOrders,
      lowStockProducts
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all orders (Admin)
router.get('/orders', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = {
      ...(status && { status }),
      ...(orderType && { orderType }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
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
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get all users (Admin)
router.get('/users', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { orders: true, preorders: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get sales analytics (Admin)
router.get('/analytics', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      salesData,
      topProducts,
      orderStatusDistribution
    ] = await Promise.all([

      // Daily sales for the period
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue
        FROM orders 
        WHERE created_at >= ${startDate} AND payment_status = 'COMPLETED'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      
      // Top selling products
      prisma.$queryRaw`
        SELECT 
          p.name,
          p.id,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ${startDate} AND o.payment_status = 'COMPLETED'
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT 10
      `,
      
      // Order status distribution
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          createdAt: {
            gte: startDate
          }
        }
      })
    ]);

    res.json({
      salesData,
      topProducts,
      orderStatusDistribution,
      preorderStats
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;