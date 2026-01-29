export {}

// Create a type for the Roles
export type Roles = 'admin' | 'supplier' | 'buyer'

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}
