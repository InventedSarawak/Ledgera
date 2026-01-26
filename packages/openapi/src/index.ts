import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)
import { generateOpenApi } from '@ts-rest/open-api'

import { apiContract } from './contracts/index'

type SecurityRequirementObject = {
    [key: string]: string[]
}

export type OperationMapper = NonNullable<Parameters<typeof generateOpenApi>[2]>['operationMapper']

const hasSecurity = (metadata: unknown): metadata is { openApiSecurity: SecurityRequirementObject[] } => {
    return !!metadata && typeof metadata === 'object' && 'openApiSecurity' in metadata
}

const hasResponseHeaders = (metadata: unknown): metadata is { openApiResponseHeaders: Record<string, any> } => {
    return !!metadata && typeof metadata === 'object' && 'openApiResponseHeaders' in metadata
}

const operationMapper: OperationMapper = (operation, appRoute) => {
    const base = {
        ...operation,
        ...(hasSecurity(appRoute.metadata)
            ? {
                  security: appRoute.metadata.openApiSecurity
              }
            : {})
    }

    // Inject response headers for pagination or other documented headers
    if (hasResponseHeaders(appRoute.metadata)) {
        const headers = appRoute.metadata.openApiResponseHeaders
        const responses = base.responses ?? {}
        const okKey = Object.keys(responses).find((k) => k === '200' || k === (200 as any)) ?? '200'
        const okResp: any = responses[okKey] ?? {}
        okResp.headers = { ...(okResp.headers ?? {}), ...headers }
        responses[okKey as any] = okResp
        return { ...base, responses }
    }

    return base
}

export const OpenAPI = Object.assign(
    generateOpenApi(
        apiContract,
        {
            openapi: '3.0.2',
            info: {
                version: '1.0.0',
                title: 'Ledgera REST API - Documentation',
                description: 'Ledgera REST API - Documentation'
            },
            servers: [
                {
                    url: 'http://localhost:8080',
                    description: 'Local Server'
                }
            ]
        },
        {
            operationMapper,
            setOperationId: true
        }
    ),
    {
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                'x-service-token': {
                    type: 'apiKey',
                    name: 'x-service-token',
                    in: 'header'
                }
            }
        }
    }
)
