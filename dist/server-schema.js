"use strict";
// import {z} from 'zod'
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMessageReplySchema = exports.workerMessageSchema = void 0;
// export const workerMessageSchema = z.object({
//     requestType: z.literal('HTTP'),
//     url: z.string(),
//     method: z.string(),
//     headers: z.record(z.string()).optional(),
//     body: z.string().optional()
//   });
//   export const workerMessageReplySchema = z.object({
//     data: z.string().optional(),
//     error: z.string().optional(),
//     errorCode: z.enum(['500','404']).optional(),
//     // statusCode: z.number().optional(),
//     // headers: z.record(z.string()).optional()
// });
// export type WorkerMessageType = z.infer<typeof workerMessageSchema> 
// export type WorkerMessageReplyType = z.infer<typeof workerMessageReplySchema> 
const zod_1 = require("zod");
exports.workerMessageSchema = zod_1.z.object({
    requestType: zod_1.z.enum(['HTTP']),
    headers: zod_1.z.any(),
    body: zod_1.z.any(),
    url: zod_1.z.string(),
});
exports.workerMessageReplySchema = zod_1.z.object({
    data: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    errorCode: zod_1.z.enum(['500', '404']).optional(),
});
