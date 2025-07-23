const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bam&Bosey Ecommerce API',
      version: '1.0.0',
      description: 'A comprehensive ecommerce API with product variants, preorders, and AI integration',
      contact: {
        name: 'Bam&Bosey Development Team',
        email: 'dev@bambosey.com',
        url: 'https://bambosey.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.bambosey.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@bambosey.com'
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe'
            },
            phone: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890'
            },
            role: {
              type: 'string',
              enum: ['CUSTOMER', 'ADMIN'],
              description: 'User role',
              example: 'CUSTOMER'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'basePrice'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique product identifier',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Product name',
              example: 'Premium T-Shirt'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'High-quality cotton t-shirt with modern fit'
            },
            basePrice: {
              type: 'number',
              format: 'decimal',
              description: 'Base price of the product',
              example: 29.99
            },
            categoryId: {
              type: 'integer',
              description: 'Category identifier',
              example: 1
            },
            sku: {
              type: 'string',
              description: 'Stock keeping unit',
              example: 'TSHIRT-001'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of image URLs',
              example: ['https://example.com/image1.jpg']
            },
            stockStatus: {
              type: 'string',
              enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'PREORDER_ONLY'],
              description: 'Current stock status',
              example: 'IN_STOCK'
            },
            allowPreorder: {
              type: 'boolean',
              description: 'Whether preorders are allowed',
              example: true
            },
            preorderPrice: {
              type: 'number',
              format: 'decimal',
              description: 'Special preorder price',
              example: 25.99
            }
          }
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            productId: {
              type: 'integer',
              example: 1
            },
            colorId: {
              type: 'integer',
              example: 1
            },
            sizeId: {
              type: 'integer',
              example: 2
            },
            sku: {
              type: 'string',
              example: 'TSHIRT-001-RED-M'
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 29.99
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://example.com/red-tshirt.jpg']
            },
            stockStatus: {
              type: 'string',
              enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
              example: 'IN_STOCK'
            }
          }
        },
        Color: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Red'
            },
            hexCode: {
              type: 'string',
              pattern: '^#[0-9A-F]{6}$',
              example: '#FF0000'
            }
          }
        },
        CartItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            productId: {
              type: 'integer',
              example: 1
            },
            productVariantId: {
              type: 'integer',
              example: 1
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 2
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 29.99
            },
            isPreorder: {
              type: 'boolean',
              example: false
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            orderNumber: {
              type: 'string',
              example: 'ORD-1641234567890-ABC12'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              example: 'PENDING'
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              example: 59.98
            },
            orderType: {
              type: 'string',
              enum: ['REGULAR', 'PREORDER'],
              example: 'REGULAR'
            },
            paymentStatus: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL'],
              example: 'PENDING'
            }
          }
        },
        Preorder: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            productId: {
              type: 'integer',
              example: 1
            },
            productVariantId: {
              type: 'integer',
              example: 1
            },
            quantity: {
              type: 'integer',
              example: 2
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 25.99
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED'],
              example: 'PENDING'
            },
            depositPaid: {
              type: 'number',
              format: 'decimal',
              example: 10.00
            },
            remainingAmount: {
              type: 'number',
              format: 'decimal',
              example: 41.98
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Resource not found'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Email is required'
                  }
                }
              },
              description: 'Validation errors'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
