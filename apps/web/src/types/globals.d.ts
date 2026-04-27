export {}

export type Roles = 'admin' | 'supplier' | 'buyer'

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}

declare module '*.css'
