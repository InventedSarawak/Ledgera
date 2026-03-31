# Ledgera API Quick Reference

## 📋 Complete Endpoint List

| Category        | Method | Endpoint                               | Description               | Auth Required | Role     |
| --------------- | ------ | -------------------------------------- | ------------------------- | ------------- | -------- |
| **Auth**        | POST   | `/api/v1/auth/login`                   | Login user                | ❌ No         | Public   |
| **Auth**        | POST   | `/api/v1/auth/register`                | Register user             | ❌ No         | Public   |
| **Auth**        | POST   | `/api/v1/auth/logout`                  | Logout user               | ✅ Yes        | Any      |
| **Auth**        | GET    | `/api/v1/auth/me`                      | Get current user          | ✅ Yes        | Any      |
| **Project**     | POST   | `/api/v1/projects`                     | Create project            | ✅ Yes        | Supplier |
| **Project**     | GET    | `/api/v1/projects/mine`                | Get my projects           | ✅ Yes        | Supplier |
| **Project**     | GET    | `/api/v1/projects/review`              | Get pending reviews       | ✅ Yes        | Admin    |
| **Project**     | GET    | `/api/v1/projects/:id`                 | Get project by ID         | ✅ Yes        | Any      |
| **Project**     | PATCH  | `/api/v1/projects/:id`                 | Update project            | ✅ Yes        | Owner    |
| **Project**     | DELETE | `/api/v1/projects/:id`                 | Delete project            | ✅ Yes        | Owner    |
| **Project**     | POST   | `/api/v1/projects/:id/submit`          | Submit for approval       | ✅ Yes        | Owner    |
| **Project**     | POST   | `/api/v1/projects/:id/approve`         | Approve & deploy token ⭐ | ✅ Yes        | Admin    |
| **Project**     | POST   | `/api/v1/projects/:id/reject`          | Reject project            | ✅ Yes        | Admin    |
| **Marketplace** | POST   | `/api/v1/marketplace/listings`         | Create listing            | ✅ Yes        | Supplier |
| **Marketplace** | GET    | `/api/v1/marketplace`                  | List all listings         | ❌ No         | Public   |
| **Marketplace** | GET    | `/api/v1/marketplace/:id`              | Get listing by ID         | ❌ No         | Public   |
| **Marketplace** | POST   | `/api/v1/marketplace/listings/:id/buy` | Purchase listing          | ✅ Yes        | Buyer    |
| **Marketplace** | DELETE | `/api/v1/marketplace/listings/:id`     | Cancel listing            | ✅ Yes        | Seller   |
| **Token**       | POST   | `/api/v1/marketplace/tokens/:id/mint`  | Mint tokens               | ✅ Yes        | Admin    |
| **Health**      | GET    | `/health`                              | Health check              | ❌ No         | Public   |
| **Health**      | GET    | `/health/ready`                        | Readiness probe           | ❌ No         | Public   |
| **Health**      | GET    | `/health/live`                         | Liveness probe            | ❌ No         | Public   |

**Legend**:

- ⭐ = Triggers blockchain interaction
- ✅ Yes = Authentication required
- ❌ No = Public endpoint

---

## 🔄 Feature Implementation Status

| Feature              | Status      | Location                 | Notes                             |
| -------------------- | ----------- | ------------------------ | --------------------------------- |
| Token Deployment     | ✅ Complete | `service/blockchain.go`  | Auto-deploys on approval          |
| Token Minting        | ✅ Complete | `service/marketplace.go` | Admin only                        |
| Marketplace Listing  | ✅ Complete | `handler/marketplace.go` | CRUD operations                   |
| Marketplace Browse   | ✅ Complete | Public endpoint          | Pagination support                |
| Purchase (DB)        | ✅ Complete | Marks as sold            | Database only                     |
| Purchase (On-Chain)  | ⚠️ Pending  | TODO                     | Needs Marketplace.sol integration |
| ETH Payment          | ⚠️ Pending  | TODO                     | On-chain payment flow             |
| Wallet Management    | ⚠️ Pending  | TODO                     | User wallet addresses             |
| Balance Verification | ⚠️ Pending  | TODO                     | Check token balances              |

---

## 🎯 User Roles & Permissions

### Public (No Auth)

- View marketplace listings
- View individual listings
- Health checks

### Supplier (Authenticated)

- **Projects**: Create, update, delete, submit
- **Marketplace**: Create listings, cancel own listings
- **Tokens**: View balances (when implemented)

### Buyer (Authenticated)

- **Marketplace**: Purchase listings
- **Tokens**: Receive tokens (when implemented)

### Admin (Authenticated)

- **Projects**: Approve, reject, view pending
- **Tokens**: Mint new tokens, deploy contracts
- **Marketplace**: All operations
- **Special**: Triggers auto-deployment

---

## 🔗 Blockchain Smart Contracts

| Contract          | Address (Local)      | Purpose            | Backend Usage          |
| ----------------- | -------------------- | ------------------ | ---------------------- |
| **AssetRegistry** | `0x5FbDB...`         | Creates new tokens | `DeployProject()`      |
| **AssetToken**    | Deployed per project | ERC20 token        | `MintTokens()`         |
| **Marketplace**   | `0xe7f17...`         | Token trading      | TODO: Full integration |

---

## 📦 Request/Response Examples

### Create Listing

**Request**: `POST /api/v1/marketplace/listings`

```json
{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.5,
    "priceEth": 0.01
}
```

**Response**: `201 Created`

```json
{
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "sellerId": "user_2abc123",
    "amount": 100.5,
    "priceEth": 0.01,
    "active": true,
    "createdAt": "2026-02-10T10:30:00Z",
    "updatedAt": "2026-02-10T10:30:00Z"
}
```

### List Marketplace

**Request**: `GET /api/v1/marketplace?page=1&limit=20&projectId=550e8400...`

**Response**: `200 OK`

```json
[
    {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "sellerId": "user_2abc123",
        "amount": 100.5,
        "priceEth": 0.01,
        "active": true,
        "createdAt": "2026-02-10T10:30:00Z",
        "updatedAt": "2026-02-10T10:30:00Z",
        "projectTitle": "Amazon Rainforest Carbon Project",
        "sellerEmail": "supplier@example.com",
        "tokenAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        "tokenSymbol": "AMAZ"
    }
]
```

**Headers**:

- `X-Total-Count: 45`
- `X-Page: 1`
- `X-Limit: 20`

### Mint Tokens

**Request**: `POST /api/v1/marketplace/tokens/550e8400.../mint`

```json
{
    "amount": 1000.0,
    "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}
```

**Response**: `200 OK`

```json
{
    "message": "Successfully minted 1000 tokens to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}
```

---

## 🔐 Authentication

### Header

```
Authorization: Bearer <jwt_token>
```

### Getting Token

```bash
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## 🧪 Testing Endpoints

### Using cURL

```bash
# List marketplace (public)
curl http://localhost:8080/api/v1/marketplace

# Get specific listing
curl http://localhost:8080/api/v1/marketplace/{id}

# Create listing (requires auth)
curl -X POST http://localhost:8080/api/v1/marketplace/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","amount":100,"priceEth":0.01}'

# Mint tokens (admin only)
curl -X POST http://localhost:8080/api/v1/marketplace/tokens/{id}/mint \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"toAddress":"0x..."}'
```

---

## 📊 Database Tables

| Table                  | Purpose         | Key Columns                                          |
| ---------------------- | --------------- | ---------------------------------------------------- |
| `users`                | User accounts   | id, email, role                                      |
| `projects`             | Carbon projects | id, title, status, contract_address                  |
| `marketplace_listings` | Token listings  | id, project_id, seller_id, amount, price_eth, active |

---

## ⚙️ Environment Variables Quick Check

```bash
# Check if configured
echo $LEDGERA_BLOCKCHAIN.RPC_URL
echo $LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS
echo $LEDGERA_BLOCKCHAIN.MARKETPLACE_ADDRESS
```

---

## 🚀 Deployment Checklist

- [ ] Anvil running on port 8545
- [ ] AssetRegistry contract deployed
- [ ] Marketplace contract deployed
- [ ] Contract addresses in `.env`
- [ ] Admin private key configured
- [ ] Go bindings generated
- [ ] Database migrated
- [ ] Backend server running

---

**Quick Start**: See [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md) for detailed setup instructions.
