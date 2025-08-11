const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all colors
router.get('/', async (req, res) => {
  try {
    const colors = await prisma.color.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(colors);
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// Create color (Admin only)
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name').trim().notEmpty(),
  body('hexCode').matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, hexCode } = req.body;

    const color = await prisma.color.create({
      data: { name, hexCode }
    });

    res.status(201).json({ message: 'Color created successfully', color });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Color name or hex code already exists' });
    }
    console.error('Error creating color:', error);
    res.status(500).json({ error: 'Failed to create color' });
  }
});

// Update color (Admin only)
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  body('name').optional().trim().notEmpty(),
  body('hexCode').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const color = await prisma.color.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Color updated successfully', color });
  } catch (error) {
    console.error('Error updating color:', error);
    res.status(500).json({ error: 'Failed to update color' });
  }
});

module.exports = router;