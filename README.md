# VetClinic QA Automation Demo

**Playwright + TypeScript · C# (Refit & RestSharp) · Azure DevOps YAML · k6 · Application Insights**

A small but complete test automation ecosystem for a fictional veterinary clinic. Patients (pets) live in the public [Swagger Petstore](https://petstore.swagger.io/) API, which is shared, eventually consistent and occasionally slow. That makes it a realistic backend for showing how to keep a suite **stable** rather than just green once.

```
vet-qa-demo/
├── app/                  minimal "VetClinic" front-end (plain HTML/JS, no dependencies)
├── playwright/           native Playwright + TypeScript framework, UI and API
│   ├── playwright.config.ts   projects: api / ui-chromium / ui-firefox; CI-only retries; traces; JUnit
│   ├── fixtures/test.ts       custom fixtures: typed API client, seeded patient with teardown, page object
│   ├── utils/petApi.ts        typed API client + bounded polling for eventual consistency
│   ├── pages/PatientsPage.ts  page object using role/label locators
│   └── tests/{api,ui}
├── api-csharp/           .NET 8 + NUnit API suite, same API covered with Refit AND RestSharp
│   ├── Clients/IPetApi.cs              Refit (interface-first client)
│   ├── Clients/PetRestClient.cs        RestSharp (hand-built requests, typical of legacy suites)
│   ├── Support/TestSupport.cs          config, unique test data, Wait.UntilAsync (no Thread.Sleep)
│   └── Tests/LegacyStabilizationExample.cs   before/after of stabilizing an inherited flaky test
├── performance/patients-load.js   k6: ramp-up profile, p95/p99 and error-rate thresholds
├── azure-pipelines.yml   Playwright ∥ C# stages → nightly/manual k6 stage, results in the Tests tab
└── docs/app-insights-kql.md   KQL queries for latency, failures, dependencies and request tracing
```

## Running it

**Playwright** (Node.js 20+)
```bash
cd playwright
npm ci
npx playwright install chromium firefox
npx playwright test                 # everything
npx playwright test --project=api   # API only
npx playwright test --grep @smoke   # smoke subset
npx playwright show-report
```

**C#** (.NET 8 SDK)
```bash
dotnet test api-csharp/VetApi.Tests.csproj --settings api-csharp/test.runsettings
dotnet test api-csharp/VetApi.Tests.csproj --filter "Category=smoke"
```

**k6**
```bash
k6 run -e PROFILE=smoke performance/patients-load.js
k6 run performance/patients-load.js          # ramp-up load profile
```

## Design choices

- **Stability over retries.** Retries run only in CI and are capped at 2, so a retried pass is reported as *flaky* instead of hidden. Reads that may lag behind a write are polled on that single call (`expect.poll` / `Wait.UntilAsync`) with a bounded timeout. There are no fixed sleeps.
- **Unique test data, guaranteed cleanup.** Every test creates its own patient with a unique id and deletes it in teardown, which matters on a backend shared with the whole internet.
- **Verify the backend, not the echo.** UI and PUT tests read the data back from the API instead of trusting the response or the success message.
- **Time-zone safe business rules.** The clinic's "Open now" status must follow UK time. `opening-hours.spec.ts` pins the clock with `page.clock` and opens the page from London, Bucharest, New York and Tokyo device time zones, including the BST → GMT switch. Every visitor must see the same status. A `test.fail()` case reproduces the naive local-time implementation (`?tzbug=1`), a bug I found on a real veterinary site.
- **Consent is tested, not assumed.** `consent.spec.ts` records every request to marketing hosts and asserts that nothing is sent before a choice or after "Reject all" (UK GDPR / PECR), and that tracking starts only after "Accept all". Writing it caught a real bug in this demo: an inline `display` style overrode the `hidden` attribute, so the banner never closed.
- **Network mocking for rare paths.** The UI's HTTP 500 handling is tested with `page.route`, because the real API almost never returns it.
- **Two C# client styles.** Refit for concise, typed new tests; RestSharp because that is what many existing suites are written in.
- **Pipeline as the source of truth.** JUnit (Playwright) and TRX (NUnit) are published to the Azure DevOps Tests tab, while HTML reports and traces are kept as artifacts. Load tests gate the nightly build through k6 thresholds.

## Local run results (12 Oct 2026, Windows)

| Suite | Result |
|---|---|
| Playwright: API + UI on Chromium and Firefox | **31/31 passed** (13.5 s), including consent and time-zone suites; new suites **48/48** with `--repeat-each=3` |
| C# NUnit: Refit + RestSharp | **11/11 passed** (4 s), stable across 3 consecutive runs (the *Before* example is `[Explicit]` by design) |
| k6 smoke (2 VUs × 30 s) | **all thresholds passed**: p95 133 ms, p99 134 ms, 0% errors, 132 requests |

---
Author: [Ionut Aursulesei](https://www.linkedin.com/in/aursulesei-ionut-b8476385), QA Automation Engineer
