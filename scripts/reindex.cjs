// helpers
const toB64url = (s) =>
  Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

const prisma = new PrismaClient();
const INDEX_NAME = 'tote-catalog';
const { SEARCH_ENDPOINT, SEARCH_ADMIN_KEY } = process.env;

async function main() {
  const client = new SearchClient(
    SEARCH_ENDPOINT,
    INDEX_NAME,
    new AzureKeyCredential(SEARCH_ADMIN_KEY)
  );

  const variants = await prisma.productVariant.findMany({
    where: { sku: { not: null }, isActive: true },
    select: {
      sku: true,
      price: true,
      images: true,
      product: { select: { name: true, basePrice: true, images: true } }
    }
  });

  const docs = variants.map(v => {
    const firstImage =
      (v.images?.length ? v.images[0] : null) ||
      (v.product?.images?.length ? v.product.images[0] : null) ||
      null;

    return {
      // Azure doc key: base64url of the actual SKU (no spaces, safe)
      id: toB64url(String(v.sku)),

      // keep original SKU retrievable too (handy for debugging or future use)
      sku: String(v.sku),

      name: v.product?.name ?? '',
      image_url: firstImage,
      price: Number(v.price ?? v.product?.basePrice ?? 0),

      // simple tags from sku — refine later if you want
      tags: String(v.sku).split(/[\s\-_/]+/).filter(Boolean)
    };
  });

  if (!docs.length) {
    console.log('No variants with SKUs found to index. Please try again later...');
    return;
  }

  console.log(`Upserting ${docs.length} docs to index "${INDEX_NAME}"...`);
  const result = await client.uploadDocuments(docs);
  const succeeded = result.results.filter(r => r.succeeded).length;
  console.log(`✅ Uploaded ${succeeded}/${docs.length} docs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
