<<<<<<< HEAD
const { PrismaClient, Prisma } = require('@prisma/client');
=======
const { PrismaClient } = require('@prisma/client');
>>>>>>> balkaran
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
<<<<<<< HEAD
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bambosey.com' },
    update: {},
    create: {
      email: 'admin@bambosey.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      cart: {
        create: {}
      }
    }
  });

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Men', description: 'Electronic devices and accessories' }
    }),
    prisma.category.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Women', description: 'Fashion and apparel' }
    }),
    prisma.category.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Kids', description: 'Books and literature' }
    }),
    prisma.category.upsert({
      where: { id: 4 },
      update: {},
      create: { name: 'Accessories', description: 'Home improvement and gardening' }
    })
  ]);

   // Create colors
  const colors = await Promise.all([
    prisma.color.upsert({
      where: { name: 'Black' },
      update: {},
      create: { name: 'Black', hexCode: '#000000' }
    }),
    prisma.color.upsert({
      where: { name: 'White' },
      update: {},
      create: { name: 'White', hexCode: '#FFFFFF' }
    }),
    prisma.color.upsert({
      where: { name: 'Red' },
      update: {},
      create: { name: 'Red', hexCode: '#FF0000' }
    }),
    prisma.color.upsert({
      where: { name: 'Blue' },
      update: {},
      create: { name: 'Blue', hexCode: '#0000FF' }
    }),
    prisma.color.upsert({
      where: { name: 'Green' },
      update: {},
      create: { name: 'Green', hexCode: '#008000' }
    }),
    prisma.color.upsert({
      where: { name: 'Navy' },
      update: {},
      create: { name: 'Navy', hexCode: '#000080' }
    }),
    prisma.color.upsert({
      where: { name: 'Gray' },
      update: {},
      create: { name: 'Gray', hexCode: '#808080' }
    })
  ]);
  console.log('Colors created');

  // Create sizes
  const sizes = await Promise.all([
    prisma.size.upsert({
      where: { name: 'XS' },
      update: {},
      create: { name: 'XS', sortOrder: 1 }
    }),
    prisma.size.upsert({
      where: { name: 'S' },
      update: {},
      create: { name: 'S', sortOrder: 2 }
    }),
    prisma.size.upsert({
      where: { name: 'M' },
      update: {},
      create: { name: 'M', sortOrder: 3 }
    }),
    prisma.size.upsert({
      where: { name: 'L' },
      update: {},
      create: { name: 'L', sortOrder: 4 }
    }),
    prisma.size.upsert({
      where: { name: 'XL' },
      update: {},
      create: { name: 'XL', sortOrder: 5 }
    }),
    prisma.size.upsert({
      where: { name: 'XXL' },
      update: {},
      create: { name: 'XXL', sortOrder: 6 }
    }),
    prisma.size.upsert({
      where: { name: 'One Size' },
      update: {},
      create: { name: 'One Size', sortOrder: 0 }
    })
  ]);
  console.log('Sizes created');


  // Create sample products
  const products = [
    {
      name: 'Mood Tote Bag',
      description: 'A bag that accentuates your mood',
      basePrice: new Prisma.Decimal(22.99),
      categoryId: 1,
      sku: 'TOTEBAG_001',
      images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'],
      stockStatus: 'IN_STOCK',
      allowPreorder: true,
      preorderPrice: new Prisma.Decimal(21.99),      // convert to Decimal
      variants: [
        { color: 'Black', price: new Prisma.Decimal(21.99), quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
        { color: 'White', price: new Prisma.Decimal(21.99), quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
        { color: 'Blue', price: new Prisma.Decimal(21.99), quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
      ]
    },
    {
      name: 'Paradise Tote Bag',
      description: 'Tote bag signalling your paradise setting',
      basePrice: new Prisma.Decimal(22.99),
      categoryId: 1,
      sku: 'TOTEBAG_002',
      images: ['https://bambosey.com/cdn/shop/files/photo-output_112.heic?v=1751346018&width=990'],
      stockStatus: 'IN_STOCK',
      allowPreorder: true,
      preorderPrice: new Prisma.Decimal(21.99),
      variants: [
        { color: 'Black', price: new Prisma.Decimal(21.99), quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
        { color: 'White', price: new Prisma.Decimal(21.99), quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
        { color: 'Blue', price: new Prisma.Decimal(21.99), quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
      ]
    },
    {
      name: 'That Girl Tote Bag',
      description: 'For the IT Girl',
      basePrice: new Prisma.Decimal(22.99),
      categoryId: 2,
      sku: 'TOTEBAG_003',
      images: ['https://example.com/nikeairmax.jpg'],
      stockStatus: 'IN_STOCK',
      allowPreorder: true,
      preorderPrice: new Prisma.Decimal(21.99),
      variants: [
        { color: 'Black', price: new Prisma.Decimal(21.99), quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
        { color: 'White', price: new Prisma.Decimal(21.99), quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
        { color: 'Blue', price: new Prisma.Decimal(21.99), quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
      ]
    },
    {
      name: 'Unbothered',
      description: 'UBNT Tote Bag for the discerning',
      basePrice: new Prisma.Decimal(22.99),
      categoryId: 3,
      sku: 'TOTEBAG_004',
      images: ['https://example.com/jsbook.jpg'],
      stockStatus: 'PREORDER_ONLY',
      allowPreorder: true,
      preorderPrice: new Prisma.Decimal(21.99),
      expectedStockDate: new Date('2024-03-15'),
      preorderLimit: 100,
      variants: [
        { color: 'White', quantity: 0, stockStatus: 'PREORDER_ONLY' },
        { color: 'Black', quantity: 0, stockStatus: 'PREORDER_ONLY' },
        { color: 'Navy', quantity: 0, stockStatus: 'PREORDER_ONLY' }
      ]
    }
  ];

  for (const productData of products) {
    const { variants, ...product } = productData;
    
    // Create the product
    const createdProduct = await prisma.product.create({
      data: product
    });

    // Create variants for the product
    for (const variantData of variants) {
      const { color, size, quantity, stockStatus, price, images, ...variantRest } = variantData;
      
      // Find color and size IDs if specified
      const colorId = color ? (await prisma.color.findUnique({ where: { name: color } }))?.id : null;
      const sizeId = size ? (await prisma.size.findUnique({ where: { name: size } }))?.id : null;
      
      // Create product variant
      const variant = await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          colorId,
          sizeId,
          price: price ? new Prisma.Decimal(price) : null,
          images: images || [],
          stockStatus: stockStatus || 'IN_STOCK',
          sku: `${product.sku}-${color || 'NONE'}-${size || 'NONE'}`.replace(/--/g, '-'),
          ...variantRest
        }
      });

      // Create inventory for the variant
      await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          quantity: quantity || 0,
          lowStockThreshold: 10
        }
      });
    }
  }

  console.log('Products with variants created');

  // Create sample preorder
  const blackTotebagVariant = await prisma.productVariant.findFirst({
    where: {
      product: { sku: 'TOTEBAG_005' },
      color: { name: 'Black' },
      size: { name: 'M' }
    }
  });

  if (blackTotebagVariant) {
    await prisma.preorder.create({
      data: {
        userId: customer.id,
        productId: blackTotebagVariant.productId,
        productVariantId: blackTotebagVariant.id,
        quantity: 2,
        basePrice: new Prisma.Decimal(21.99),
        status: 'PENDING',
        expectedDate: new Date('2024-02-15'),
        depositPaid: new Prisma.Decimal(10.00),
        remainingAmount: new Prisma.Decimal(11.99)
      }
    });
    console.log('Sample preorder created');
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
=======
// Create admin user
const adminPassword = await bcrypt.hash('admin123', 10);
const admin = await prisma.user.upsert({
  where: { email: 'admin@bambosey.com' },
  update: {},
  create: {
    email: 'admin@bambosey.com',
    passwordHash: adminPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    cart: {
      create: {}
    }
  }
});

// Create customer user
const customerPassword = await bcrypt.hash('customer123', 10);
const customer = await prisma.user.upsert({
  where: { email: 'customer@example.com' },
  update: {},
  create: {
    email: 'customer@example.com',
    passwordHash: customerPassword,
    firstName: 'John',
    lastName: 'Doe',
    role: 'CUSTOMER',
    cart: {
      create: {}
    }
  }
});

// Create categories
const categories = await Promise.all([
  prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Men', description: 'Electronic devices and accessories' }
  }),
  prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Women', description: 'Fashion and apparel' }
  }),
  prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'Kids', description: 'Books and literature' }
  }),
  prisma.category.upsert({
    where: { id: 4 },
    update: {},
    create: { name: 'Accessories', description: 'Home improvement and gardening' }
  })
]);

  // Create colors
const colors = await Promise.all([
  prisma.color.upsert({
    where: { name: 'Black' },
    update: {},
    create: { name: 'Black', hexCode: '#000000' }
  }),
  prisma.color.upsert({
    where: { name: 'White' },
    update: {},
    create: { name: 'White', hexCode: '#FFFFFF' }
  }),
  prisma.color.upsert({
    where: { name: 'Red' },
    update: {},
    create: { name: 'Red', hexCode: '#FF0000' }
  }),
  prisma.color.upsert({
    where: { name: 'Blue' },
    update: {},
    create: { name: 'Blue', hexCode: '#0000FF' }
  }),
  prisma.color.upsert({
    where: { name: 'Green' },
    update: {},
    create: { name: 'Green', hexCode: '#008000' }
  }),
  prisma.color.upsert({
    where: { name: 'Navy' },
    update: {},
    create: { name: 'Navy', hexCode: '#000080' }
  }),
  prisma.color.upsert({
    where: { name: 'Gray' },
    update: {},
    create: { name: 'Gray', hexCode: '#808080' }
  })
]);
console.log('Colors created');

// Create sizes
const sizes = await Promise.all([
  prisma.size.upsert({
    where: { name: 'XS' },
    update: {},
    create: { name: 'XS', sortOrder: 1 }
  }),
  prisma.size.upsert({
    where: { name: 'S' },
    update: {},
    create: { name: 'S', sortOrder: 2 }
  }),
  prisma.size.upsert({
    where: { name: 'M' },
    update: {},
    create: { name: 'M', sortOrder: 3 }
  }),
  prisma.size.upsert({
    where: { name: 'L' },
    update: {},
    create: { name: 'L', sortOrder: 4 }
  }),
  prisma.size.upsert({
    where: { name: 'XL' },
    update: {},
    create: { name: 'XL', sortOrder: 5 }
  }),
  prisma.size.upsert({
    where: { name: 'XXL' },
    update: {},
    create: { name: 'XXL', sortOrder: 6 }
  }),
  prisma.size.upsert({
    where: { name: 'One Size' },
    update: {},
    create: { name: 'One Size', sortOrder: 0 }
  })
]);
console.log('Sizes created');


// Create sample products
const products = [
  {
    name: 'Mood Tote Bag',
    description: 'A bag that accentuates your mood',
    basePrice: 22.99,
    categoryId: 1,
    sku: 'TOTEBAG_001',
    images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'],
    stockStatus: 'IN_STOCK',
    allowPreorder: true,
    preorderPrice: 21.99,
    variants: [
      { color: 'Black', size: 'One Size', price: 21.99, quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
      { color: 'White', size: 'One Size', price: 21.99, quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
      { color: 'Blue', size: 'One Size', price: 21.99, quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
    ]
  },
  {
    name: 'Paradise Tote Bag',
    description: 'Tote bag signalling your paradise setting',
    basePrice: 29.99,
    categoryId: 1,
    sku: 'TOTEBAG_002',
    images: ['https://bambosey.com/cdn/shop/files/photo-output_112.heic?v=1751346018&width=990'],
    stockStatus: 'IN_STOCK',
    allowPreorder: true,
    preorderPrice: 21.99,
    variants: [
      { color: 'Black', size: 'One Size', price: 21.99, quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
      { color: 'White', size: 'One Size', price: 21.99, quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
      { color: 'Blue', size: 'One Size', price: 21.99, quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
    ]
  },
  {
    name: 'That Girl Tote Bag',
    description: 'For the IT Girl',
    basePrice: 22.99,
    categoryId: 2,
    sku: 'TOTEBAG_003',
    images: ['https://bambosey.com/cdn/shop/files/photo-output_113.heic?v=1751342819&width=990'],
    stockStatus: 'IN_STOCK',
    allowPreorder: true,
    preorderPrice: 21.99,
    variants: [
      { color: 'Black', size: 'One Size', price: 21.99, quantity: 50, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] },
      { color: 'White', size: 'One Size', price: 21.99, quantity: 30, images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990g'] },
      { color: 'Blue', size: 'One Size', price: 21.99, quantity: 0, stockStatus: 'OUT_OF_STOCK', images: ['https://bambosey.com/cdn/shop/files/photo-output123.heic?v=1751346312&width=990'] }
    ]
  },
  {
    name: 'Unbothered',
    description: 'UBNT Tote Bag for the discerning',
    basePrice: 29.99,
    categoryId: 3,
    sku: 'TOTEBAG_004',
    images: ['https://bambosey.com/cdn/shop/files/9CD1629B-8C7E-48BD-A2E6-E8363F20E203_4_5005_c.jpg?v=1753050301'],
    stockStatus: 'PREORDER_ONLY',
    allowPreorder: true,
    preorderPrice: 139.99,
    expectedStockDate: new Date('2024-03-15'),
    preorderLimit: 100,
    variants: [
      { color: 'White', size: 'One Size', quantity: 0, stockStatus: 'PREORDER_ONLY' },
      { color: 'Black', size: 'One Size', quantity: 0, stockStatus: 'PREORDER_ONLY' },
      { color: 'Navy', size: 'One Size', quantity: 0, stockStatus: 'PREORDER_ONLY' }
    ]
  }
];

for (const productData of products) {
  const { variants, ...product } = productData;
  
  // Create the product
  const createdProduct = await prisma.product.create({
    data: product
  });

  // Create variants for the product
  for (const variantData of variants) {
    const { color, size, quantity, stockStatus, price, images, ...variantRest } = variantData;
    
    // Find color and size IDs if specified
    const colorId = color ? (await prisma.color.findUnique({ where: { name: color } }))?.id : null;
    const sizeId = size ? (await prisma.size.findUnique({ where: { name: size } }))?.id : null;
    
    // Create product variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: createdProduct.id,
        colorId,
        sizeId,
        price: price || null,
        images: images || [],
        stockStatus: stockStatus || 'IN_STOCK',
        sku: `${product.sku}-${color || 'NONE'}-${size || 'NONE'}`.replace(/--/g, '-'),
        ...variantRest
      }
    });

    // Create inventory for the variant
    await prisma.inventory.create({
      data: {
        productVariantId: variant.id,
        quantity: quantity || 0,
        lowStockThreshold: 10
      }
    });
  }
}

console.log('Products with variants created');

// Create sample preorder
const blackTotebagVariant = await prisma.productVariant.findFirst({
  where: {
    product: { sku: 'TOTEBAG_001' },
    color: { name: 'Black' },
    size: { name: 'One Size' }
  }
});

if (blackTotebagVariant) {
  await prisma.preorder.create({
    data: {
      userId: customer.id,
      productId: blackTotebagVariant.productId,
      productVariantId: blackTotebagVariant.id,
      quantity: 2,
      price: 21.99,
      status: 'PENDING',
      expectedDate: new Date('2024-02-15'),
      depositPaid: 10.00,
      remainingAmount: 33.98
    }
  });
  console.log('Sample preorder created');
}

console.log('Database seeded successfully!');
}

main()
.catch((e) => {
  console.error(e);
  process.exit(1);
})
.finally(async () => {
  await prisma.$disconnect();
});
>>>>>>> balkaran
