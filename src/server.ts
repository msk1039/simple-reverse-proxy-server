import cluster, { Worker } from "node:cluster";
import os from "node:os";
import http, { request } from "node:http";
import { ConfigSchemaType, rootConfigSchema } from "./config-schema";
import { WorkerMessageType, workerMessageSchema } from "./server-schema";
import { WorkerMessageReplyType , workerMessageReplySchema } from "./server-schema";

interface CreateServerConfig {
  port: number;
  workerCount: number;
  config: ConfigSchemaType;
}

interface WorkerState {
  hasResponded: boolean;
}

export async function createServer(config: CreateServerConfig) {
  const { workerCount, port } = config;

  const WORKER_POOL: (Worker | undefined)[] = [];

  if (cluster.isPrimary) {
    console.log("master process is up");

    for (let i = 0; i < workerCount; i++) {
      const w = cluster.fork({ config: JSON.stringify(config.config) });
      WORKER_POOL.push(w);
      console.log(`Master process: Worker node spinned up ${i}`);
    }

    const server = http.createServer(async (req, res) => {
      const workerState: WorkerState = { hasResponded: false };
      
      const worker = WORKER_POOL[Math.floor(Math.random() * WORKER_POOL.length)];
      
      if (!worker) {
        if (!workerState.hasResponded) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'No workers available' }));
          workerState.hasResponded = true;
        }
        return;
      }

      const workerMessage: WorkerMessageType = {
        requestType: 'HTTP',
        url: req.url || '/',
        // method: req.method,
        headers: req.headers,
        body: null
      };
      
      worker.send(JSON.stringify(workerMessage));

      worker.once('message', (message: string) => {
        if (!workerState.hasResponded) {
          try {
            const parsedMessage = JSON.parse(message);
            const validatedResponse = workerMessageReplySchema.safeParse(parsedMessage);
            
            if (!validatedResponse.success) {
              res.writeHead(500);
              res.end(JSON.stringify({
                error: "Invalid message format",
                errorCode: "500"
              }));
            } else {
              const response = validatedResponse.data;
              const statusCode = response.errorCode ? parseInt(response.errorCode) : 200;
              res.writeHead(statusCode);
              res.end(JSON.stringify(response));
            }
          } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({
              error: "Failed to process worker response",
              errorCode: "500"
            }));
          }
          workerState.hasResponded = true;
        }
      });
    });

    server.listen(port);
  } else {
    console.log("Worker node");
    const config = await rootConfigSchema.parseAsync(
      JSON.parse(`${process.env.config}`)
    );

    function pathToRegex(path: string): RegExp {
      const escaped = path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = escaped.replace(/\\\*\\\*/g, '.*');
      return new RegExp(`^${pattern}$`);
    }

    function findMatchingRule(requestURL: string, rules: any[]): any {
      const sortedRules = [...rules].sort((a, b) => b.path.length - a.path.length);
      return sortedRules.find(rule => pathToRegex(rule.path).test(requestURL));
    }

    process.on("message", async (message: string) => {
      try {
        const messagevalidated = await workerMessageSchema.parseAsync(
          JSON.parse(message)
        );

        const requestURL = messagevalidated.url;
        const rule = findMatchingRule(requestURL, config.server.rules);

        if (!rule) {
          const reply: WorkerMessageReplyType = {
            errorCode: "404",
            error: "rule not found",
          };
          if (process.send) {
            return process.send(JSON.stringify(reply));
          }
          return;
        }

        const upstreamID = rule?.upstreams[0];
        const upstream = config.server.upstreams.find(e => e.id === upstreamID);

        if (!upstreamID) {
          const reply: WorkerMessageReplyType = {
            errorCode: "500",
            error: "upstream not found",
          };
          if (process.send) {
            return process.send(JSON.stringify(reply));
          }

          // Ensure no further code is executed after sending the response
          return;
        }

        const proxyReq = http.request({host: upstream?.url , path: requestURL , method: 'GET'}, (proxyRes)=>{
              let body ='';

              proxyRes.on('data',(chunk)=>{
                  body+=chunk;
              });

              proxyRes.on('end',()=>{
                  const reply: WorkerMessageReplyType = {
                      data:body
                  };

                  if(process.send) return process.send(JSON.stringify(reply));
              })
        })
        proxyReq.end();
      } catch (error) {
        const reply: WorkerMessageReplyType = {
          errorCode: "500",
          error: "Invalid message format",
        };
        if (process.send) {
          return process.send(JSON.stringify(reply));
        }
      }
    });
  }
}
