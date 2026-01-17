import { initContract } from '@ts-rest/core'
import { healthContract } from './health'
import { counterContract } from './counter'

const c = initContract()

export const apiContract = c.router({
    Health: healthContract,
    Counter: counterContract
})
