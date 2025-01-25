# Simple Node.js Reverse Proxy
A basic reverse proxy server built with Node.js that forwards HTTP GET requests to predefined upstream servers.

## Core Features
- Basic HTTP request forwarding
- YAML-based configuration
- Multi-worker process support
- Path-based routing with pattern matching
- Static upstream server definitions
- Technical Implementation
- Uses Node.js cluster for worker processes
- Configuration managed through YAML
- Path matching with regex patterns
- Single request type (GET) support
- Random worker selection for request handling

## Quick Start

```
# Install dependencies
npm install

# Start server with config
npm start -- --config config.yaml
```
## Configuration Example
```
server:
  listen: 8000
  workers: 4
  
  upstreams:
    - id: upstream1
      url: jsonplaceholder.typicode.com

  rules:
    - path: /**
      upstreams:
        - upstream1
```

## Limitations

- Only supports GET requests
- No load balancing algorithms
- No health checks
- No request/response transformation
- No SSL/TLS support
- No request queueing
- No retry mechanisms

