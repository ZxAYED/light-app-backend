import swaggerJsdoc, { OAS3Options } from "swagger-jsdoc";

const options: OAS3Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Shalana Backend API",
      version: "1.0.0",
      description: "Created by ZXayed",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local",
      },
    ],
    // No security scheme as requested
  },
  // Use POSIX-style globs so it works reliably on Windows too
  apis: [
    "src/app/routes/**/*.ts",
    "src/app/modules/**/*.ts",
  ],
};

export const openapiSpec = swaggerJsdoc(options);