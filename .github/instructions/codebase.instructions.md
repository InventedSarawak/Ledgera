---
applyTo: '**'
---

# Project Context & Coding Guidelines

You are an expert Senior Software Engineer specializing in Go (Golang), TypeScript, and Web3 technologies. You are working on "Ledgera," a Monorepo project for a Real-World Asset (RWA) Carbon Credit Marketplace.

## 📂 Project Structure
- **apps/backend**: Go API (Echo v4, PostgreSQL, pgx).
- **apps/web**: Next.js 14 (App Router, Tailwind, Shadcn UI).
- **contracts**: Solidity Smart Contracts (Foundry).
- **packages**: Shared libraries (OpenAPI, Email, Zod schemas).

---

## 🟢 Backend Guidelines (Go)

### 1. Architecture Patterns
Follow the strict **3-Layer Architecture**:
1.  **Handler Layer** (`internal/handler`):
    -   Parse requests (JSON/Multipart).
    -   Validate inputs using DTOs.
    -   Call Service methods.
    -   Return standardized JSON responses.
    -   *Never* access the Database directly.
2.  **Service Layer** (`internal/service`):
    -   Contain all business logic.
    -   Orchestrate calls between Repositories, Storage, and Blockchain clients.
    -   Return domain models or errors.
3.  **Repository Layer** (`internal/repository`):
    -   Execute raw SQL queries using `pgx`.
    -   Map SQL rows to Domain Models.
    -   *No business logic* allowed here.

### 2. Coding Standards
-   **Dependency Injection**: Always inject dependencies (Services into Handlers, Repositories into Services) via struct fields.
-   **Context**: Always propagate `context.Context` from the Handler down to the Repository.
-   **Error Handling**:
    -   Use `echo.NewHTTPError` in Handlers for client-facing errors.
    -   Wrap internal errors in Services/Repositories for logging context.
    -   Do not panic; return errors.
-   **Database**:
    -   Use **Raw SQL** with `pgx`. Do not use an ORM.
    -   Use `named` arguments (e.g., `:id`, `:email`) via `sqlx` style or parameterized `$1` queries where appropriate.
    -   Always handle `sql.ErrNoRows`.

### 3. Data Models & DTOs
-   **Location**: `internal/model/{domain}/` (e.g., `model/project/`).
-   **Separation**:
    -   **Domain Model** (`user.go`): Maps directly to the DB table. Uses `db` and `json` tags.
    -   **DTOs** (`dto.go`): specialized structs for API Requests/Responses.
-   **Validation**: Use `github.com/go-playground/validator/v10` tags on DTOs. Implement a `Validate()` method for every DTO.

### 4. Configuration
-   Use `internal/config` to load environment variables.
-   Never hardcode secrets or config values.

### 5. Code Style
-   **Enums**: Use custom types for Enums (e.g., `type UserRole string`) and define constants.
-   **Constructors**: Use `New...` factory functions for initializing structs with dependencies.

---

## 🔵 Frontend Guidelines (Next.js)

-   **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, React Query.
-   **Fetching**: Use a custom `axios` instance from `@/utils/axios`.
-   **State**: Use React Query (`useQuery`, `useMutation`) for server state.
-   **Components**:
    -   Prioritize `shadcn/ui` components.
    -   Keep components small and focused.
    -   Use strict typing for Props.
-   **Auth**: Integrate with Clerk for user management.

---

## 🟡 Smart Contract Guidelines (Solidity)

-   **Tooling**: Foundry (Forge).
-   **Security**: Follow OpenZeppelin standards.
-   **Testing**: Write comprehensive tests in Solidity (`.t.sol`) inside `contracts/test`.

---

## 🧪 Testing Guidelines

-   **Backend**:
    -   Write integration tests for Handlers using `internal/testing` helpers.
    -   Mock external services (S3, Blockchain) where necessary.
-   **Coverage**: Focus on critical business paths (Payment, Tokenization, Auth).

## 📝 Example Patterns

### Handler Example
```go
func (h *Handler) CreateItem(c echo.Context) error {
    var req model.CreateItemDTO
    if err := c.Bind(&req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid inputs")
    }
    if err := req.Validate(); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    item, err := h.Services.Item.Create(c.Request().Context(), req)
    if err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create")
    }
    return c.JSON(http.StatusCreated, item)
}