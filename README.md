# node-red-contrib-onstar2

[![CodeQL](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/codeql-analysis.yml)
[![Dependency Review](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/dependency-review.yml)
[![Lint Code Base](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/super-linter.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/super-linter.yml)
[![Node.js CI](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/node.js.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/node.js.yml)
[![Node.js Package](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/npm-publish.yml)
<!-- [![Notarize Assets with CAS](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/cas_notarize.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/cas_notarize.yml)
[![Authenticate Assets with CAS](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/cas_authenticate.yml/badge.svg)](https://github.com/BigThunderSR/node-red-contrib-onstar2/actions/workflows/cas_authenticate.yml) -->

A Node-RED flow for controlling GM OnStar vehicles powered by [OnStarJS](https://github.com/samrum/OnStarJS) originally written by [caseyjmorton](https://www.npmjs.com/~caseyjmorton) and published [here](https://www.npmjs.com/package/node-red-contrib-onstar). Please note that only US and Canadian OnStar accounts are known to work with this integration.

This fork is for me to experiment with the capabilities exposed in the original version and to add custom commands as necessary.

- ***Following a major re-write, this project is now at version 2.x and is fully independent from the original npm package.***

- ***Version 2.x has breaking changes, but no further breaking changes are expected at this time.***

[![npm](https://img.shields.io/npm/v/node-red-contrib-onstar2.svg)](https://www.npmjs.com/package/node-red-contrib-onstar2)

<!-- ![node-red-contrib-onstar2-sample_s](https://user-images.githubusercontent.com/17056173/205470439-c27a5fc0-2ec3-4043-bef3-408042f78d29.png) -->
![Nodes_node-red-contrib-onstar2](https://github.com/BigThunderSR/node-red-contrib-onstar2/assets/17056173/dc0a0993-5e64-4445-b38e-f24a90c2256c)

## 🚀 New: REST API for Brandt AI Integration

This project now includes a **REST API server** that exposes the OnStar functionality for integration with AI assistants like Brandt. The API provides the same vehicle control capabilities as the Node-RED nodes but through HTTP endpoints.

### Quick Start - REST API

1. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your OnStar credentials
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run the API server:**
```bash
# Development
npm run dev

# Production
npm start

# Or with Docker
docker-compose -f docker-compose.node.yml up -d
```

4. **Test the API:**
```bash
curl -X GET "http://localhost:8080/health" \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

### Available REST Endpoints

- `POST /climate/start` - Start climate preconditioning
- `POST /climate/stop` - Stop climate preconditioning
- `POST /doors/lock` - Lock vehicle doors
- `POST /doors/unlock` - Unlock vehicle doors
- `GET /status` - Get comprehensive vehicle status
- `GET /location` - Get vehicle location
- `GET /diagnostics` - Get detailed vehicle diagnostics
- And many more...

See the [API Documentation](#api-documentation) section below for complete details.

---

## 📦 Node-RED Installation

```sh
npm install node-red-contrib-onstar2
```

## 📚 Documentation

Each node is self-explanatory with hints provided wherever necessary as well as detailed information in the Help section of each node as necessary.

## 🏃‍♂️ Running

Collect the following information:

1. [Generate](https://www.uuidgenerator.net/version4) a v4 uuid for the device ID
1. OnStar login: username, password, PIN, [TOTP Key (Please click link for instructions)](https://github.com/BigThunderSR/OnStarJS?tab=readme-ov-file#new-requirement-as-of-2024-11-19)
1. Your car's VIN. Easily found in the monthly OnStar diagnostic emails.

## ✅ Supported Features

- Lock Doors
- Unlock Doors
- Lock Trunk
- Unlock Trunk
- Start
- Stop (Cancel Start)
- Set Charge Profile
- Get Charge Profile
- Override Charge State
- Vehicle Alert (Lights and Horn)
- Vehicle Alert (Lights Only)
- Vehicle Alert (Horn Only)
- Cancel Vehicle Alert
- Get Vehicle Location
- Get Diagnostic Information
- Get Vehicle Capabilities

## 📖 API Documentation

### Authentication

All REST API endpoints require API key authentication via Bearer token:

```bash
curl -X POST "http://localhost:8080/climate/start" \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes": 10}'
```

### Response Format

All endpoints return JSON responses in this format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "timestamp": "2025-01-10T10:30:00Z",
  "data": {
    // Endpoint-specific data
  }
}
```

### Example Usage

#### Start Climate Control
```bash
curl -X POST "http://localhost:8080/climate/start" \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "duration_minutes": 15,
    "force": false
  }'
```

#### Get Vehicle Status
```bash
curl -X GET "http://localhost:8080/status" \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

#### Lock Vehicle Doors
```bash
curl -X POST "http://localhost:8080/doors/lock" \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

### Rate Limits

- OnStar enforces 30-minute intervals between command sequences
- Vehicle may enter hibernation mode after 4-5 requests
- Respect rate limits to avoid API blocks

## 🔧 Development

### Node-RED Development
```bash
npm test
```

### REST API Development
```bash
npm run dev
```

## 🐳 Docker Deployment

### Node-RED Nodes
```bash
npm install node-red-contrib-onstar2
```

### REST API
```bash
docker-compose -f docker-compose.node.yml up -d
```

## 🔗 My other related projects

- [https://github.com/BigThunderSR/onstar2mqtt](https://github.com/BigThunderSR/onstar2mqtt)

- [https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt](https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt)
