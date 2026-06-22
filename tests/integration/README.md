# Integration Tests

These tests require the application to be running locally.

## Running Integration Tests

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run integration tests
npm run test -- tests/integration

# Or run all tests (will skip integration if server not running)
npm run test:unit
```

## Tests Included

- API route validation (/api/auth/signup, /api/auth/login, /api/checkin)
- Rate limiting enforcement
- HTTP response format verification
- Authentication requirements

## Note

Integration tests are designed to fail gracefully if the dev server isn't running. They test actual HTTP endpoints with real network requests.
