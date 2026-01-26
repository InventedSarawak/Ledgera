import fs from 'fs'
import pino from 'pino'

import { OpenAPI } from './index'

const replaceCustomFileTypesToOpenApiCompatible = (jsonString: string): string => {
    const searchPattern =
        /{"type":"object","properties":{"type":{"type":"string","enum":\["file"\]}},\s*"required":\["type"\]}/g
    const replacement = `{"type":"string","format":"binary"}`

    return jsonString.replace(searchPattern, replacement)
}

const filteredDoc = replaceCustomFileTypesToOpenApiCompatible(JSON.stringify(OpenAPI))

const formattedDoc = JSON.parse(filteredDoc)

const filePaths = ['../../apps/backend/static/openapi.json']

const logger = pino({
    name: 'openapi-gen',
    level: 'info'
})

filePaths.forEach((filePath) => {
    fs.writeFile(filePath, JSON.stringify(formattedDoc, null, 2), (err) => {
        if (err) {
            logger.error({ err }, `Error writing to ${filePath}`)
        }
    })
})
