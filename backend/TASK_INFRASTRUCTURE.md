## Async Task Infrastructure (v1.0)

This system implements a Redis-backed queue system for deterministic background processing of high-latency or critical maintenance tasks.

### Setup

1. **Install Redis:**
   - Option 1: Using Docker (recommended)
     ```bash
     cd backend
     docker-compose up -d
     ```
   
   - Option 2: Install locally
     ```bash
     # Ubuntu/Debian
     sudo apt-get install redis-server
     # macOS
     brew install redis
     ```

2. **Start the worker process:**
   ```bash
   cd backend
   npm run worker
   ```

### Architecture

The system consists of:

- **TaskService**: Centralized service for queuing and managing background tasks
- **Job Processors**: Specialized handlers for different types of tasks
- **Workers**: Separate processes that execute queued jobs
- **Queues**: Dedicated queues for different task types:
  - `default`: General tasks
  - `indexing`: Project indexing operations
  - `memory_gardening`: Memory maintenance and cleanup
  - `image_gen`: Image generation tasks

### API Endpoints

- `POST /api/v1/index` - Queues a project indexing job
- `GET /api/v1/tasks/:jobId` - Poll for task status

### Task Status Response

```json
{
  "status": "completed|failed|active|waiting|delayed|paused|unknown",
  "progress": 0-100,
  "result": {},
  "error": "error message if failed"
}
```

### Usage

Tasks are automatically queued for background processing when calling endpoints like `/api/v1/index`. Clients can then poll the `/api/v1/tasks/:jobId` endpoint to check the status of their tasks.