import { initContract } from "@ts-rest/core";
import { ZCounter } from "@ledgera/zod";
import { getSecurityMetadata } from "../utils.js";

const c = initContract();
const metadata = getSecurityMetadata();

export const counterContract = c.router({
  getCounter: {
    summary: "Get counter",
    path: "/counter",
    method: "GET",
    description: "Get or create counter for authenticated user",
    responses: {
      200: ZCounter,
    },
    metadata: metadata,
  },
  incrementCounter: {
    summary: "Increment counter",
    path: "/counter/increment",
    method: "POST",
    body: null,
    description: "Increment counter value by 1",
    responses: {
      200: ZCounter,
    },
    metadata: metadata,
  },
  decrementCounter: {
    summary: "Decrement counter",
    path: "/counter/decrement",
    method: "POST",
    body: null,
    description: "Decrement counter value by 1",
    responses: {
      200: ZCounter,
    },
    metadata: metadata,
  },
  resetCounter: {
    summary: "Reset counter",
    path: "/counter/reset",
    method: "POST",
    body: null,
    description: "Reset counter value to 0",
    responses: {
      200: ZCounter,
    },
    metadata: metadata,
  },
});
