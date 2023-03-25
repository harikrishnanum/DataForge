const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerFile = require('./swagger.json')

const options = {
  definition: swaggerFile,
  apis: ['server.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {explorer: true}));
};