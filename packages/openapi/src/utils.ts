import { match } from 'ts-pattern'

export const getSecurityMetadata = ({
    security = true,
    securityType = 'bearer'
}: {
    security?: boolean
    securityType?: 'bearer' | 'service'
} = {}) => {
    const openApiSecurity = match(securityType)
        .with('bearer', () => [
            {
                bearerAuth: []
            }
        ])
        .with('service', () => [
            {
                'x-service-token': []
            }
        ])
        .exhaustive()

    return {
        ...(security && { openApiSecurity })
    }
}

export const getPaginationHeadersMetadata = () => {
    return {
        openApiResponseHeaders: {
            'X-Total-Count': {
                description: 'Total number of items matching the query',
                schema: { type: 'integer', format: 'int64' }
            },
            'X-Page': {
                description: 'Current page number (1-based)',
                schema: { type: 'integer', format: 'int32' }
            },
            'X-Limit': {
                description: 'Page size (items per page)',
                schema: { type: 'integer', format: 'int32' }
            }
        }
    }
}
