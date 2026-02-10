# Ledgera API Endpoints Documentation

## Overview

This document lists all available API endpoints in the Ledgera backend, including the newly implemented marketplace and blockchain features.

---

## 🔐 Authentication Endpoints

### POST `/api/v1/auth/login`

**Description**: Authenticate user and get session token  
**Access**: Public  
**Request Body**:

```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

### POST `/api/v1/auth/register`

**Description**: Register a new user account  
**Access**: Public

### POST `/api/v1/auth/logout`

**Description**: Logout and invalidate session  
**Access**: Authenticated users

### GET `/api/v1/auth/me`

**Description**: Get current authenticated user profile  
**Access**: Authenticated users

---

## 🌲 Project Endpoints

### POST `/api/v1/projects`

**Description**: Create a new carbon credit project  
**Access**: Authenticated users (Suppliers)  
**Role**: Supplier  
**Request**: Multipart/form-data

- `title`: string (required)
- `description`: string (required)
- `locationLat`: number (required)
- `locationLng`: number (required)
- `area`: number (required, > 0)
- `carbonAmount`: number (required, > 0)
- `image`: file (required)
- `auditReport`: file (required)

### GET `/api/v1/projects/mine`

**Description**: Get all projects created by current user  
**Access**: Authenticated users (Suppliers)  
**Role**: Supplier  
**Query Parameters**:

- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 20, max: 100)

### GET `/api/v1/projects/review`

**Description**: Get all projects pending review  
**Access**: Authenticated users (Admins)  
**Role**: Admin  
**Query Parameters**:

- `page`: number (optional)
- `limit`: number (optional)

### GET `/api/v1/projects/:id`

**Description**: Get a specific project by ID  
**Access**: Authenticated users  
**Role**: All authenticated users

### PATCH `/api/v1/projects/:id`

**Description**: Update a project  
**Access**: Authenticated users (Project owner)  
**Role**: Supplier (owner)  
**Request**: Multipart/form-data (all fields optional)

- `title`: string
- `description`: string
- `locationLat`: number
- `locationLng`: number
- `area`: number
- `carbonAmount`: number
- `image`: file (optional)
- `auditReport`: file (optional)

### DELETE `/api/v1/projects/:id`

**Description**: Delete a project  
**Access**: Authenticated users (Project owner)  
**Role**: Supplier (owner)

### POST `/api/v1/projects/:id/submit`

**Description**: Submit project for admin approval  
**Access**: Authenticated users (Project owner)  
**Role**: Supplier (owner)

### POST `/api/v1/projects/:id/approve`

**Description**: Approve a project and automatically deploy blockchain token  
**Access**: Authenticated users (Admins)  
**Role**: Admin  
**Note**: This automatically triggers token deployment via AssetRegistry contract

### POST `/api/v1/projects/:id/reject`

**Description**: Reject a project submission  
**Access**: Authenticated users (Admins)  
**Role**: Admin

---

## 🛒 Marketplace Endpoints

### POST `/api/v1/marketplace/listings`

**Description**: Create a new marketplace listing for carbon credit tokens  
**Access**: Authenticated users (Suppliers)  
**Role**: Supplier  
**Request Body**:

```json
{
    "projectId": "uuid",
    "amount": 100.5,
    "priceEth": 0.01
}
```

**Response**: Listing object

### GET `/api/v1/marketplace`

**Description**: List all active marketplace listings  
**Access**: Public (No authentication required)  
**Role**: Everyone  
**Query Parameters**:

- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 20, max: 100)
- `projectId`: string (optional, filter by project)
- `active`: boolean (optional, filter by active status)

**Response Headers**:

- `X-Total-Count`: Total number of listings
- `X-Page`: Current page
- `X-Limit`: Items per page

### GET `/api/v1/marketplace/:id`

**Description**: Get a specific marketplace listing  
**Access**: Public (No authentication required)  
**Role**: Everyone

### POST `/api/v1/marketplace/listings/:id/buy`

**Description**: Purchase carbon credits from a marketplace listing  
**Access**: Authenticated users (Buyers)  
**Role**: Buyer  
**Note**: Currently marks listing as sold. Full on-chain payment implementation pending.

### DELETE `/api/v1/marketplace/listings/:id`

**Description**: Cancel a marketplace listing  
**Access**: Authenticated users (Seller only)  
**Role**: Supplier (listing owner)

---

## 🪙 Token Management Endpoints

### POST `/api/v1/marketplace/tokens/:id/mint`

**Description**: Mint new carbon credit tokens for a project  
**Access**: Authenticated users (Admins only)  
**Role**: Admin  
**Request Body**:

```json
{
    "amount": 1000.0,
    "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}
```

**Note**: Project must be deployed (have a contract address). Amount is in tokens (with 18 decimals on-chain).

---

## 🏥 Health Endpoints

### GET `/health`

**Description**: Basic health check  
**Access**: Public

### GET `/health/ready`

**Description**: Readiness probe (checks database connectivity)  
**Access**: Public

### GET `/health/live`

**Description**: Liveness probe  
**Access**: Public

---

## 📊 Role-Based Access Summary

| Role         | Description                    | Endpoints Access                                                           |
| ------------ | ------------------------------ | -------------------------------------------------------------------------- |
| **Public**   | Unauthenticated users          | Health checks, View marketplace listings                                   |
| **Supplier** | Project creators/token sellers | Create projects, Create listings, Cancel own listings, Update own projects |
| **Buyer**    | Token purchasers               | Buy marketplace listings                                                   |
| **Admin**    | Platform administrators        | Approve/reject projects, Mint tokens, View pending reviews                 |

---

## 🔗 Blockchain Integration

### Token Deployment Flow

1. Supplier creates a project → Status: `DRAFT`
2. Supplier submits for review → Status: `PENDING`
3. Admin approves project → Status: `APPROVED`
4. **Automatic**: Backend deploys token via AssetRegistry contract → Status: `DEPLOYED`
5. Token address is stored in `project.contractAddress`

### Minting Flow

1. Admin calls `POST /api/v1/marketplace/tokens/:id/mint`
2. Backend calls AssetToken.mint() on deployed contract
3. Tokens are minted to specified address

### Marketplace Flow (Current Implementation)

1. Supplier creates listing with amount and price
2. Buyers can browse listings (public)
3. Buyer purchases listing
4. **TODO**: On-chain token transfer and ETH payment

---

## 🔧 Environment Variables Required

### Blockchain Configuration

```bash
LEDGERA_BLOCKCHAIN.RPC_URL="http://127.0.0.1:8545"
LEDGERA_BLOCKCHAIN.CHAIN_ID=31337
LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS="0x..."  # AssetRegistry contract
LEDGERA_BLOCKCHAIN.MARKETPLACE_ADDRESS="0x..."  # Marketplace contract
LEDGERA_BLOCKCHAIN.ADMIN_PRIVATE_KEY="0x..."  # Admin wallet private key
```

---

## 📝 Status Codes

- `200 OK`: Successful GET/POST request
- `201 Created`: Resource successfully created
- `204 No Content`: Successful DELETE or action with no response body
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 🚀 Next Steps / TODOs

1. **Marketplace Contract Integration**:
    - Implement actual on-chain listing via Marketplace.sol
    - Handle ETH payment for purchases
    - Transfer tokens from seller to buyer on-chain

2. **Wallet Management**:
    - Add `wallet_address` field to users table
    - Allow users to connect MetaMask/WalletConnect
    - Validate wallet ownership

3. **Token Balance Verification**:
    - Check seller's token balance before allowing listing
    - Verify buyer has sufficient ETH before purchase

4. **Events & Notifications**:
    - Emit events for listings created/sold
    - Send email notifications for project approvals
    - Notify sellers when listings are purchased

5. **Analytics**:
    - Track total carbon credits tokenized
    - Monitor marketplace volume
    - Project approval rates

---

## 📚 Additional Resources

- [Blockchain Setup Guide](../docs/BLOCKCHAIN_SETUP.md)
- [Generate Bindings](./apps/backend/docs/GENERATE_BINDINGS.md)
- [Smart Contracts](./contracts/src/)
- [OpenAPI Schema](./packages/openapi/)
