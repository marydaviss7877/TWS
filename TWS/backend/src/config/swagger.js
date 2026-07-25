const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TWS Messaging System API',
      version: '1.0.0',
      description: 'Comprehensive messaging system with analytics, monitoring, and compliance features',
      contact: {
        name: 'TWS Team',
        email: 'support@tws.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.tws.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service communication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'system'],
              description: 'User role'
            },
            orgId: {
              type: 'string',
              description: 'Organization ID'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            lastActive: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp'
            }
          }
        },
        Chat: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Chat ID'
            },
            name: {
              type: 'string',
              description: 'Chat name'
            },
            type: {
              type: 'string',
              enum: ['direct', 'group', 'channel'],
              description: 'Chat type'
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string'
                  },
                  role: {
                    type: 'string',
                    enum: ['member', 'admin', 'owner']
                  },
                  joinedAt: {
                    type: 'string',
                    format: 'date-time'
                  }
                }
              }
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Chat creation timestamp'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Message ID'
            },
            content: {
              type: 'string',
              description: 'Message content'
            },
            sender: {
              type: 'string',
              description: 'Sender user ID'
            },
            chatId: {
              type: 'string',
              description: 'Chat ID'
            },
            type: {
              type: 'string',
              enum: ['text', 'image', 'file', 'system'],
              description: 'Message type'
            },
            isEncrypted: {
              type: 'boolean',
              description: 'Whether message is encrypted'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: {
                    type: 'string'
                  },
                  url: {
                    type: 'string'
                  },
                  size: {
                    type: 'number'
                  },
                  mimeType: {
                    type: 'string'
                  }
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Message creation timestamp'
            },
            edited: {
              type: 'boolean',
              description: 'Whether message was edited'
            },
            editedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last edit timestamp'
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'File ID'
            },
            filename: {
              type: 'string',
              description: 'Original filename'
            },
            originalName: {
              type: 'string',
              description: 'Original filename'
            },
            url: {
              type: 'string',
              description: 'File URL'
            },
            size: {
              type: 'number',
              description: 'File size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type'
            },
            uploadedBy: {
              type: 'string',
              description: 'Uploader user ID'
            },
            chatId: {
              type: 'string',
              description: 'Associated chat ID'
            },
            status: {
              type: 'string',
              enum: ['uploading', 'processing', 'completed', 'failed'],
              description: 'Upload status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp'
            }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Audit log ID'
            },
            action: {
              type: 'string',
              description: 'Action performed'
            },
            performedBy: {
              type: 'string',
              description: 'User who performed the action'
            },
            targetMessage: {
              type: 'string',
              description: 'Target message ID (if applicable)'
            },
            targetChat: {
              type: 'string',
              description: 'Target chat ID (if applicable)'
            },
            organization: {
              type: 'string',
              description: 'Organization ID'
            },
            reason: {
              type: 'string',
              description: 'Reason for the action'
            },
            details: {
              type: 'object',
              description: 'Additional details'
            },
            ipAddress: {
              type: 'string',
              description: 'IP address of the requester'
            },
            userAgent: {
              type: 'string',
              description: 'User agent string'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Action timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Error code or type'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Unauthorized access',
                error: 'UNAUTHORIZED'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Insufficient permissions',
                error: 'FORBIDDEN'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found',
                error: 'NOT_FOUND'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format'
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Messaging',
        description: 'Chat and message operations'
      },
      {
        name: 'Files',
        description: 'File upload and management'
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'Metrics',
        description: 'System metrics and monitoring'
      },
      {
        name: 'Compliance',
        description: 'Audit logs and compliance features'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/modules/**/routes/**/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TWS API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
