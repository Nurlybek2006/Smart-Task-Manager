import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'Smart Task Manager API',
      version: '1.0.0',
      description:
        'Jira/Trello стиліндегі тапсырмаларды басқару жүйесінің API документациясы',
    },

    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },

  apis: [
    './src/modules/**/*.routes.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);