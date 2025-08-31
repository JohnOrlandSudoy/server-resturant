# AdminRestu Server

A comprehensive restaurant management system server with **hybrid online/offline capabilities**, **real-time communication**, and **role-based access control**.

## 🚀 Features

- **Multi-role Authentication**: Admin, Cashier, Kitchen, Inventory Manager
- **Real-time Communication**: WebSocket-based live updates
- **Offline Mode**: Local SQLite database with sync capabilities
- **Supabase Integration**: Cloud database with PostgreSQL
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions per user role
- **API Documentation**: Comprehensive REST API endpoints

## 🛠️ Technology Stack

- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety and development experience
- **Supabase** - Cloud database (PostgreSQL)
- **SQLite** - Local offline database
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **Winston** - Logging
- **Joi** - Request validation

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd adminRestu-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://ejwhazrasqfgijbqsjay.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 4. Run Supabase Schema

Execute the SQL schema in your Supabase project:

```sql
-- Copy and run the contents of SUPABASE_SCHEMA.sql in your Supabase SQL editor
```

### 5. Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 🔐 Authentication

### Demo Credentials

The system includes demo users for testing:

- **Admin**: `admin` / `admin123`
- **Cashier**: `cashier` / `cashier123`
- **Kitchen**: `kitchen` / `kitchen123`

### Login Endpoint

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "username": "admin",
      "role": "admin",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/queue/kitchen` - Get kitchen queue
- `GET /api/orders/queue/cashier` - Get cashier queue

### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/categories` - Get menu categories

### Inventory
- `GET /api/inventory` - Get all ingredients
- `GET /api/inventory/alerts` - Get low stock alerts

### Customers
- `GET /api/customers` - Get all customers

### Employees
- `GET /api/employees` - Get all employees

### Sync
- `GET /api/sync/status` - Get sync status
- `GET /api/sync/queue` - Get sync queue

### Network
- `GET /api/network/devices` - Get network devices
- `GET /api/network/health` - Get network health

## 🔌 WebSocket Events

### Client to Server
- `join-room` - Join role-specific room
- `order-created` - New order created
- `order-status-updated` - Order status changed
- `inventory-updated` - Inventory updated
- `sync-request` - Request data sync
- `register-device` - Register device

### Server to Client
- `new-order` - New order notification (Kitchen)
- `order-status-changed` - Order status update (Cashier)
- `order-updated` - Order update (Admin)
- `inventory-changed` - Inventory update (Admin)
- `ingredient-updated` - Ingredient update (Kitchen)
- `sync-needed` - Sync request (Admin)

## 🏗️ Project Structure

```
src/
├── app.ts                 # Main application entry point
├── types/                 # TypeScript interfaces and types
├── routes/                # API route handlers
│   ├── authRoutes.ts      # Authentication routes
│   ├── orderRoutes.ts     # Order management routes
│   ├── menuRoutes.ts      # Menu management routes
│   ├── inventoryRoutes.ts # Inventory management routes
│   ├── customerRoutes.ts  # Customer management routes
│   ├── employeeRoutes.ts  # Employee management routes
│   ├── syncRoutes.ts      # Data sync routes
│   └── networkRoutes.ts   # Network management routes
├── services/              # Business logic services
│   ├── supabaseService.ts # Supabase database service
│   └── databaseService.ts  # Local SQLite service
├── middleware/            # Express middleware
│   ├── authMiddleware.ts  # Authentication middleware
│   └── errorHandler.ts    # Error handling middleware
├── utils/                 # Utility functions
│   ├── logger.ts          # Winston logger
│   └── jwtService.ts      # JWT token service
└── websocket/             # WebSocket handlers
    └── websocket.ts       # Socket.io setup
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production Supabase credentials
3. Set secure JWT secret
4. Configure CORS for production domain
5. Set up logging and monitoring

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Express rate limiter
- **CORS Protection**: Cross-origin resource sharing
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## 📊 Monitoring

- **Winston Logging**: Structured logging with multiple levels
- **Error Handling**: Comprehensive error middleware
- **Health Checks**: `/health` endpoint for monitoring
- **Performance**: Request compression and optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**AdminRestu Server** - Powering modern restaurant management with offline capabilities and real-time features.
