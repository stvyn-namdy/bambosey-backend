// routes/findSimilar.js
const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3001';

const DEMO_PRODUCTS = [
  {
    id: 'demo-001',
    name: 'Mood Tote Bag',
    price: 22.99,
    image_url: `https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990`,
  },
  {
    id: 'demo-002',
    name: 'Paradise Tote Bag',
    price: 29.99,
    image_url: `https://bambosey.com/cdn/shop/files/photo-output_112.heic?v=1751346018&width=990`,
  },
  {
    id: 'demo-003',
    name: 'That Girl Tote Bag',
    price: 22.99,
    image_url: `https://bambosey.com/cdn/shop/files/photo-output_113.heic?v=1751342819&width=990`,
  },
  {
    id: 'demo-004',
    name: 'Unbothered',
    price: 29.99,
    image_url: `https://bambosey.com/cdn/shop/files/9CD1629B-8C7E-48BD-A2E6-E8363F20E203_4_5005_c.jpg?v=1753050301`,
  },
];

// CORS preflight (leave as-is if your client is separate)
router.options('/find-similar', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// POST /find-similar (field "file" is accepted but ignored)
router.post('/find-similar', upload.single('file'), async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const picks = DEMO_PRODUCTS.slice(0, 8); // send up to 8 items
    return res.json({ similar: picks });
  } catch (err) {
    console.error('find-similar error:', err);
    return res.status(500).json({ error: 'Internal error in visual search' });
  }
});

module.exports = router;
