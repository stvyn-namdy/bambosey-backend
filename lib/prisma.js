// // const { PrismaClient } = require('@prisma/client');

// // const prisma = new PrismaClient();

// // module.exports = prisma;

// // ESM file. If your project uses CJS, rename to .cjs and change imports accordingly.
// import { PrismaClient } from '@prisma/client';

// export const prisma = globalThis.prisma ?? new PrismaClient({ log: ['error', 'warn'] });

// if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

// lib/prisma.js
const { PrismaClient } = require('@prisma/client');

let prisma;

// avoid creating many clients in dev with nodemon
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

module.exports = prisma;
