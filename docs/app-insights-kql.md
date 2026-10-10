# Application Insights: KQL queries for QA

Run these in Azure Portal → Application Insights → **Logs**. These are the queries a QA engineer reaches for when a test fails or the API slows down.

## 1. Slowest endpoints in the last hour (p50/p95/p99)
```kql
requests
| where timestamp > ago(1h)
| summarize count(), p50 = percentile(duration, 50), p95 = percentile(duration, 95), p99 = percentile(duration, 99) by name
| order by p95 desc
```

## 2. Failed requests during a test run (filter by the run's time window)
```kql
requests
| where timestamp between (datetime(2026-10-14 10:00) .. datetime(2026-10-14 10:20))
| where success == false
| summarize count() by name, resultCode
| order by count_ desc
```

## 3. Where the time goes: slow downstream dependencies (DB, third-party APIs)
```kql
dependencies
| where timestamp > ago(1h)
| summarize calls = count(), avgMs = avg(duration), p95 = percentile(duration, 95), failures = countif(success == false) by target, type, name
| order by p95 desc
```

## 4. Exceptions behind a failing endpoint
```kql
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage, operation_Name
| order by count_ desc
```

## 5. Follow one failing test request end to end
Copy the `operation_Id` (or the `traceparent` header) from the failed request, then:
```kql
union requests, dependencies, exceptions, traces
| where operation_Id == "<operation-id>"
| project timestamp, itemType, name, resultCode, duration, message, outerMessage
| order by timestamp asc
```

## 6. Did latency regress after the last deploy?
```kql
requests
| where timestamp > ago(2d)
| summarize p95 = percentile(duration, 95) by bin(timestamp, 1h), name
| render timechart
```
