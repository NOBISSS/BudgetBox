# API notes

All endpoints are rooted at `/api`. Authenticated endpoints require `Authorization: Bearer <token>` and use the standard `{ success, data }` response envelope. Every recurring schedule query is scoped to the authenticated user.

## Recurring payments

### `POST /budget/recurring/sync`

Sync up to 100 client schedules at a time. The frontend writes each change to that user's IndexedDB before sending it. `clientId` is a stable client generated schedule id. Dates are calendar dates in `YYYY-MM-DD`; `updatedAt` is an ISO timestamp.

```json
{
  "records": [
    {
      "clientId": "local-schedule-id",
      "name": "Internet",
      "category": "bills",
      "amount": 3000,
      "frequency": "quarterly",
      "startDate": "2026-01-31",
      "dueDay": 31,
      "isActive": true,
      "paidOccurrences": ["2026-01-31"],
      "isDeleted": false,
      "updatedAt": "2026-01-31T09:00:00.000Z"
    }
  ]
}
```

Supported categories are `bills`, `food`, `transport`, `subscriptions`, and `miscellaneous`. Supported frequencies are `daily`, `weekly`, `monthly`, `quarterly`, `yearly`, and `one-time`. For calendar frequencies, `dueDay` values beyond a month's length are clamped to its final date. The response contains per-record outcomes (`created`, `updated`, `unchanged`, or `conflict_server_wins`) and the authoritative schedule. Last-write-wins compares `updatedAt`; every client id is unique only within its owner.

### `GET /budget/recurring/changes?since=<ISO timestamp>`

Returns that user's schedules whose server update timestamp is newer than `since`, including inactive and deleted tombstones. A first sync uses the Unix epoch timestamp. The frontend applies a pulled record only if its client copy is not newer, and stores a separate recurring pull cursor.

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "local-schedule-id",
        "clientId": "local-schedule-id",
        "userId": "owner-id",
        "name": "Internet",
        "category": "bills",
        "amount": 3000,
        "frequency": "quarterly",
        "startDate": "2026-01-31",
        "dueDay": 31,
        "isActive": true,
        "paidOccurrences": ["2026-01-31"],
        "isDeleted": false,
        "updatedAt": "2026-01-31T09:00:00.000Z",
        "serverUpdatedAt": "2026-01-31T09:00:00.200Z",
        "version": 1
      }
    ]
  }
}
```

The existing monthly budget endpoints remain `POST /budget/sync`, `GET /budget/latest`, `GET /budget/history?year=`, and `GET /budget/changes?since=`. They continue syncing category totals independently from recurring schedule definitions.
