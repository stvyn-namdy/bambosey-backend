const swaggerEnvironments = {
  development: {
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
      .swagger-ui .info .description { margin: 20px 0 }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1
    }
  },
  production: {
    servers: [
      {
        url: 'https://api.bambosey.com/api',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.bambosey.com/api',
        description: 'Staging server'
      }
    ],
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #059669 }
    `,
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: false,
      filter: true,
      docExpansion: 'none'
    }
  }
};

module.exports = swaggerEnvironments;