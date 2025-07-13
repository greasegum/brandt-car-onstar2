# Database Logging System

## Overview

The Brandt Car API includes a comprehensive PostgreSQL logging system that captures all API requests, responses, and analytics data. This system provides detailed insights into API usage, safety violations, and performance metrics.

## Database Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brandt_car_api
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
```

### Railway Integration

For Railway deployment, set these environment variables in your Railway dashboard:

```bash
DB_HOST=your-postgres-service.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your_railway_password
DB_SSL=true
```

## Database Schema

### command_log Table

The main logging table captures all API interactions:

```sql
CREATE TABLE command_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    api_key_hash VARCHAR(64),
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    vehicle_vin VARCHAR(17),
    command_type VARCHAR(50),
    safety_level VARCHAR(20),
    requires_confirmation BOOLEAN,
    confirmation_provided BOOLEAN,
    environment VARCHAR(50),
    deployment_id VARCHAR(100)
);
```

### Indexes

Performance indexes for efficient querying:

```sql
CREATE INDEX idx_command_log_timestamp ON command_log(timestamp);
CREATE INDEX idx_command_log_endpoint ON command_log(endpoint);
CREATE INDEX idx_command_log_success ON command_log(success);
CREATE INDEX idx_command_log_vehicle_vin ON command_log(vehicle_vin);
```

## Logged Data

### Request Information
- **Endpoint**: API path (e.g., `/doors/lock`)
- **Method**: HTTP method (GET, POST, etc.)
- **User Agent**: Client browser/application
- **IP Address**: Client IP address
- **API Key Hash**: SHA256 hash of API key (for security)

### Response Information
- **Status Code**: HTTP response status
- **Response Body**: Full response data (JSON)
- **Execution Time**: Request processing time in milliseconds
- **Success**: Boolean indicating successful execution
- **Error Message**: Error details if failed

### Safety Information
- **Vehicle VIN**: Target vehicle identifier
- **Command Type**: Category of command (climate_control, door_control, etc.)
- **Safety Level**: Risk level (safe, medium, high_risk)
- **Confirmation Required**: Whether confirmation was needed
- **Confirmation Provided**: Whether confirmation was given

### Environment Information
- **Environment**: Deployment environment (production, development)
- **Deployment ID**: Railway deployment identifier

## Analytics Endpoints

### GET /analytics/stats
Get command statistics with filtering options.

**Query Parameters:**
- `days` (number): Time period in days (default: 7)
- `endpoint` (string): Filter by specific endpoint
- `success` (boolean): Filter by success status
- `vehicle_vin` (string): Filter by vehicle VIN

**Response:**
```json
{
  "success": true,
  "data": {
    "period_days": 7,
    "filters": { "endpoint": "/doors/lock" },
    "statistics": {
      "total_requests": 150,
      "successful_requests": 145,
      "failed_requests": 5,
      "avg_execution_time": 1250,
      "max_execution_time": 5000,
      "confirmation_required": 20,
      "confirmation_provided": 18,
      "high_risk_commands": 0,
      "medium_risk_commands": 25,
      "safe_commands": 125
    }
  }
}
```

### GET /analytics/recent
Get recent command history with pagination.

**Query Parameters:**
- `limit` (number): Number of records (default: 50)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "commands": [
      {
        "id": 123,
        "timestamp": "2025-01-04T10:30:00.000Z",
        "endpoint": "/doors/lock",
        "method": "POST",
        "ip_address": "192.168.1.100",
        "response_status": 200,
        "execution_time_ms": 1250,
        "success": true,
        "vehicle_vin": "1G1FZ6S02L4128522",
        "command_type": "door_control",
        "safety_level": "safe",
        "requires_confirmation": false,
        "confirmation_provided": false,
        "environment": "production"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
}
```

### GET /analytics/errors
Get error logs with filtering.

**Query Parameters:**
- `days` (number): Time period in days (default: 7)
- `limit` (number): Number of records (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": 124,
        "timestamp": "2025-01-04T10:35:00.000Z",
        "endpoint": "/alert/lights",
        "method": "POST",
        "ip_address": "192.168.1.100",
        "error_message": "This endpoint has been disabled for safety reasons",
        "request_body": { "duration_seconds": 30 },
        "response_status": 403,
        "vehicle_vin": "1G1FZ6S02L4128522",
        "command_type": "alert",
        "safety_level": "high_risk"
      }
    ],
    "period_days": 7,
    "total_errors": 1
  }
}
```

### GET /analytics/safety
Get safety violations and risk analysis.

**Query Parameters:**
- `days` (number): Time period in days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "violations": [
      {
        "id": 125,
        "timestamp": "2025-01-04T10:40:00.000Z",
        "endpoint": "/doors/unlock",
        "ip_address": "192.168.1.100",
        "request_body": {},
        "response_status": 400,
        "error_message": "This action requires confirmation",
        "vehicle_vin": "1G1FZ6S02L4128522",
        "command_type": "door_control",
        "safety_level": "medium",
        "requires_confirmation": true,
        "confirmation_provided": false
      }
    ],
    "period_days": 30,
    "total_violations": 1,
    "risk_breakdown": {
      "high_risk_attempts": 0,
      "missing_confirmations": 1,
      "disabled_endpoint_attempts": 0
    }
  }
}
```

### POST /analytics/cleanup
Clean up old log entries.

**Request Body:**
```json
{
  "days_to_keep": 90
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_records": 1500,
    "days_kept": 90,
    "timestamp": "2025-01-04T10:45:00.000Z"
  }
}
```

## Security Features

### API Key Hashing
- API keys are hashed using SHA256 before storage
- Original keys are never stored in the database
- Hash comparison for analytics and debugging

### IP Address Tracking
- Client IP addresses are logged for security monitoring
- Helps identify suspicious activity patterns
- Supports both IPv4 and IPv6 addresses

### Sensitive Data Protection
- Request/response bodies are stored as JSONB
- No automatic filtering of sensitive data
- Consider implementing data masking for production

## Performance Considerations

### Connection Pooling
- Uses PostgreSQL connection pooling
- Configurable pool size (default: 20 connections)
- Automatic connection management

### Indexing Strategy
- Timestamp index for time-based queries
- Endpoint index for endpoint-specific analytics
- Success index for error analysis
- Vehicle VIN index for vehicle-specific queries

### Data Retention
- Automatic cleanup of old logs (configurable)
- Default retention: 90 days
- Manual cleanup via API endpoint

## Monitoring and Alerts

### Key Metrics to Monitor
- **Request Volume**: Total API calls per time period
- **Error Rate**: Percentage of failed requests
- **Response Time**: Average execution time
- **Safety Violations**: Attempts to bypass safety measures
- **High-Risk Commands**: Usage of dangerous endpoints

### Alert Conditions
- Error rate > 5% over 1 hour
- Response time > 10 seconds average
- Multiple safety violations from same IP
- High-risk command attempts when disabled

## Integration Examples

### Dashboard Integration
```javascript
// Get daily statistics for dashboard
const stats = await axios.get('/analytics/stats?days=1');
const dailyStats = stats.data.data.statistics;

console.log(`Daily API calls: ${dailyStats.total_requests}`);
console.log(`Success rate: ${(dailyStats.successful_requests / dailyStats.total_requests * 100).toFixed(1)}%`);
console.log(`Average response time: ${dailyStats.avg_execution_time}ms`);
```

### Safety Monitoring
```javascript
// Monitor safety violations
const safety = await axios.get('/analytics/safety?days=1');
const violations = safety.data.data.violations;

if (violations.length > 0) {
    console.log('⚠️ Safety violations detected:');
    violations.forEach(v => {
        console.log(`  • ${v.timestamp}: ${v.endpoint} - ${v.error_message}`);
    });
}
```

### Performance Analysis
```javascript
// Analyze slow requests
const recent = await axios.get('/analytics/recent?limit=100');
const slowRequests = recent.data.data.commands.filter(cmd => cmd.execution_time_ms > 5000);

if (slowRequests.length > 0) {
    console.log('🐌 Slow requests detected:');
    slowRequests.forEach(req => {
        console.log(`  • ${req.endpoint}: ${req.execution_time_ms}ms`);
    });
}
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```
❌ Database logging disabled: connection to database failed
```
**Solution**: Check database credentials and network connectivity

#### Table Creation Failed
```
❌ Failed to initialize database tables: permission denied
```
**Solution**: Ensure database user has CREATE TABLE permissions

#### Performance Issues
```
⚠️ Slow query execution on analytics endpoints
```
**Solution**: Check indexes and consider query optimization

### Debug Commands

#### Check Database Connection
```bash
# Test connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();"
```

#### View Recent Logs
```sql
SELECT timestamp, endpoint, method, success, execution_time_ms 
FROM command_log 
ORDER BY timestamp DESC 
LIMIT 10;
```

#### Check Safety Violations
```sql
SELECT timestamp, endpoint, ip_address, error_message 
FROM command_log 
WHERE success = false 
AND timestamp >= NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;
```

## Best Practices

### Data Management
- Regular cleanup of old logs (90 days recommended)
- Monitor database size and growth
- Consider archiving old data for compliance

### Security
- Regularly review safety violation logs
- Monitor for unusual API usage patterns
- Implement rate limiting based on analytics

### Performance
- Monitor query performance on analytics endpoints
- Consider read replicas for heavy analytics workloads
- Implement caching for frequently accessed statistics

### Compliance
- Ensure logging meets data retention requirements
- Implement data export capabilities if needed
- Consider GDPR/privacy implications of logged data 