import { initContract } from '@ts-rest/core'
import { healthContract } from './health'
import { authContract } from './auth'
import { projectContract } from './project'

const c = initContract()

export const apiContract = c.router({
    Health: healthContract,
    Auth: authContract,
    Project: projectContract
})
