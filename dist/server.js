"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const node_cluster_1 = __importDefault(require("node:cluster"));
const node_http_1 = __importDefault(require("node:http"));
const config_schema_1 = require("./config-schema");
const server_schema_1 = require("./server-schema");
const server_schema_2 = require("./server-schema");
function createServer(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { workerCount, port } = config;
        const WORKER_POOL = [];
        if (node_cluster_1.default.isPrimary) {
            console.log("master process is up");
            for (let i = 0; i < workerCount; i++) {
                const w = node_cluster_1.default.fork({ config: JSON.stringify(config.config) });
                WORKER_POOL.push(w);
                console.log(`Master process: Worker node spinned up ${i}`);
            }
            const server = node_http_1.default.createServer((req, res) => __awaiter(this, void 0, void 0, function* () {
                const workerState = { hasResponded: false };
                const worker = WORKER_POOL[Math.floor(Math.random() * WORKER_POOL.length)];
                if (!worker) {
                    if (!workerState.hasResponded) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'No workers available' }));
                        workerState.hasResponded = true;
                    }
                    return;
                }
                const workerMessage = {
                    requestType: 'HTTP',
                    url: req.url || '/',
                    // method: req.method,
                    headers: req.headers,
                    body: null
                };
                worker.send(JSON.stringify(workerMessage));
                worker.once('message', (message) => {
                    if (!workerState.hasResponded) {
                        try {
                            const parsedMessage = JSON.parse(message);
                            const validatedResponse = server_schema_2.workerMessageReplySchema.safeParse(parsedMessage);
                            if (!validatedResponse.success) {
                                res.writeHead(500);
                                res.end(JSON.stringify({
                                    error: "Invalid message format",
                                    errorCode: "500"
                                }));
                            }
                            else {
                                const response = validatedResponse.data;
                                const statusCode = response.errorCode ? parseInt(response.errorCode) : 200;
                                res.writeHead(statusCode);
                                res.end(JSON.stringify(response));
                            }
                        }
                        catch (err) {
                            res.writeHead(500);
                            res.end(JSON.stringify({
                                error: "Failed to process worker response",
                                errorCode: "500"
                            }));
                        }
                        workerState.hasResponded = true;
                    }
                });
            }));
            server.listen(port);
        }
        else {
            console.log("Worker node");
            const config = yield config_schema_1.rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));
            function pathToRegex(path) {
                const escaped = path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const pattern = escaped.replace(/\\\*\\\*/g, '.*');
                return new RegExp(`^${pattern}$`);
            }
            function findMatchingRule(requestURL, rules) {
                const sortedRules = [...rules].sort((a, b) => b.path.length - a.path.length);
                return sortedRules.find(rule => pathToRegex(rule.path).test(requestURL));
            }
            process.on("message", (message) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const messagevalidated = yield server_schema_1.workerMessageSchema.parseAsync(JSON.parse(message));
                    const requestURL = messagevalidated.url;
                    const rule = findMatchingRule(requestURL, config.server.rules);
                    if (!rule) {
                        const reply = {
                            errorCode: "404",
                            error: "rule not found",
                        };
                        if (process.send) {
                            return process.send(JSON.stringify(reply));
                        }
                        return;
                    }
                    const upstreamID = rule === null || rule === void 0 ? void 0 : rule.upstreams[0];
                    const upstream = config.server.upstreams.find(e => e.id === upstreamID);
                    if (!upstreamID) {
                        const reply = {
                            errorCode: "500",
                            error: "upstream not found",
                        };
                        if (process.send) {
                            return process.send(JSON.stringify(reply));
                        }
                        // Ensure no further code is executed after sending the response
                        return;
                    }
                    const proxyReq = node_http_1.default.request({ host: upstream === null || upstream === void 0 ? void 0 : upstream.url, path: requestURL, method: 'GET' }, (proxyRes) => {
                        let body = '';
                        proxyRes.on('data', (chunk) => {
                            body += chunk;
                        });
                        proxyRes.on('end', () => {
                            const reply = {
                                data: body
                            };
                            if (process.send)
                                return process.send(JSON.stringify(reply));
                        });
                    });
                    proxyReq.end();
                }
                catch (error) {
                    const reply = {
                        errorCode: "500",
                        error: "Invalid message format",
                    };
                    if (process.send) {
                        return process.send(JSON.stringify(reply));
                    }
                }
            }));
        }
    });
}
