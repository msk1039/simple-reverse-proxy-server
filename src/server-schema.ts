// import {z} from 'zod'


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
import {z} from 'zod'


export const workerMessageSchema = z.object({
    requestType: z.enum(['HTTP']),
    headers: z.any(),
    body:z.any(),
    url: z.string(),
});

export const workerMessageReplySchema = z.object({
    data: z.string().optional(),
    error: z.string().optional(),
    errorCode: z.enum(['500','404']).optional(),

});


export type WorkerMessageType = z.infer<typeof workerMessageSchema> 
export type WorkerMessageReplyType = z.infer<typeof workerMessageReplySchema> 