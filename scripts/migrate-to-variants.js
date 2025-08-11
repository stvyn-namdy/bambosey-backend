const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateExistingProducts() {
  console.log('🔄 Starting migration to product variants...');

  try {
    // Get all existing products that don't have variants
    const products = await prisma.product.findMany({
      where: {
        variants: {
          none: {}
        }
      }
    });

    for (const product of products) {
      console.log(`Migrating product: ${product.name}`);

      // Create a default variant for each existing product
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: product.sku ? `${product.sku}-DEFAULT` : null,
          price: null, // Will use product base price
          images: [],
          stockStatus: 'IN_STOCK'
        }
      });

      // Create inventory for the variant with default quantity
      await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          quantity: 0
        }
      });

      console.log(`✅ Migrated product: ${product.name}`);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateExistingProducts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = migrateExistingProducts;
