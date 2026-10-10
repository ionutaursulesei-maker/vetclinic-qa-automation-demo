# VetClinic QA Demo: Playwright + C# + Azure DevOps + k6

Proiect demo construit după descrierea rolului **QA Engineer – Test Automation / TestOps** (Arnia, client final din domeniul medical/veterinar). Scenariul e o clinică veterinară care își ține pacienții (animalele) în **Swagger Petstore**, un API public, partajat și uneori instabil. Exact pe un astfel de backend se exersează stabilizarea testelor flaky.

```
vet-qa-demo/
├── app/                    mini front-end „VetClinic” (HTML + JS, fără dependențe)
├── playwright/             framework nativ Playwright + TypeScript (UI + API)
│   ├── playwright.config.ts   proiecte api / ui-chromium / ui-firefox, retries în CI, trace, JUnit
│   ├── fixtures/test.ts       fixtures custom: petApi, registeredPatient (setup + teardown), patientsPage
│   ├── utils/petApi.ts        client API tipizat + polling pentru eventual consistency
│   ├── pages/PatientsPage.ts  page object cu locatori pe rol/label
│   └── tests/api, tests/ui    teste
├── api-csharp/             suita API în C# (.NET 8, NUnit) cu Refit ȘI RestSharp
│   ├── Clients/IPetApi.cs        Refit: API-ul descris ca interfață
│   ├── Clients/PetRestClient.cs  RestSharp: request-uri construite manual (stil „legacy”)
│   ├── Support/TestSupport.cs    config, date unice, Wait.UntilAsync (polling în loc de Thread.Sleep)
│   └── Tests/LegacyStabilizationExample.cs   ÎNAINTE / DUPĂ stabilizarea unui test moștenit
├── performance/patients-load.js   k6: ramp-up, thresholds p95/p99, rata de erori
├── azure-pipelines.yml     3 stage-uri: Playwright ∥ C# → k6 (nightly/manual), cu PublishTestResults
└── docs/app-insights-kql.md   query-uri KQL pentru latență, erori, dependințe, trasarea unui request
```

## Cum rulezi

**Playwright** (cere Node.js 20+):
```bash
cd playwright
npm install
npx playwright install chromium firefox
npx playwright test               # toate
npx playwright test --project=api # doar API
npx playwright show-report        # raport HTML
```

**C#** (cere .NET 8 SDK):
```bash
dotnet test api-csharp/VetApi.Tests.csproj --settings api-csharp/test.runsettings
dotnet test api-csharp/VetApi.Tests.csproj --filter "Category=smoke"
```

**k6** (cere k6 instalat):
```bash
k6 run -e PROFILE=smoke performance/patients-load.js
```

## Legătura cu cerințele rolului

| Cerința clientului | Unde e în demo |
|---|---|
| Framework nativ Playwright, UI + API, TypeScript | `playwright/`: config, fixtures, page object, teste API și UI |
| Preluarea testelor stricate, stabilizare, teste flaky | `utils/petApi.ts` (`waitUntilVisible`), `LegacyStabilizationExample.cs`, retries doar în CI, trace la primul retry |
| Suita API legacy în C#, cu Refit / RestSharp | `api-csharp/`: același API testat cu ambele librării |
| Azure DevOps, YAML pipelines, test tasks | `azure-pipelines.yml`: stage-uri paralele, PublishTestResults (JUnit + TRX), artefacte, schedule |
| Performance / load (k6, JMeter) | `performance/patients-load.js`: stages și thresholds care fac stage-ul să pice |
| Application Insights, latență API | `docs/app-insights-kql.md` + teste cu buget de latență |
| AI coding tools (Claude Code) | proiectul însuși, construit cu Claude Code |

## Puncte de discuție pentru interviu

1. **„Ai moștenit o suită stricată. Ce faci?”**
   Rulez totul de câteva ori și împart failure-urile în trei: produs, test sau mediu. Pun testele flaky în carantină, cu tag, ca să nu blocheze pipeline-ul, dar să rămână vizibile. Apoi caut cauzele clasice: id-uri fixe pe un backend partajat, `Thread.Sleep`, ordinea testelor, date nescoase după rulare, clienți HTTP nedisposed. Exemplul concret e în `LegacyStabilizationExample.cs`.

2. **„Retries: da sau nu?”**
   Da, doar în CI și limitat la 2. Un test care trece la retry e raportat ca *flaky* și ajunge pe listă pentru reparat. Retry-ul nu are voie să ascundă problema. La partea de API, polling-ul țintit pe un singur apel (`expect.poll` sau `Wait.UntilAsync`) e mai bun decât retry-ul pe tot testul.

3. **„Refit sau RestSharp?”**
   Refit descrie API-ul ca o interfață și e scurt și tipizat, potrivit pentru suite noi. RestSharp construiește request-urile manual și e mai flexibil la cazuri ciudate. Multe suite mai vechi sunt scrise în RestSharp. Le pot menține pe amândouă.

4. **„Cum folosești Application Insights când pică un test?”**
   Iau `operation_Id` din request-ul picat și urmăresc în KQL requests, dependencies și exceptions. Așa văd dacă problema e în API, în baza de date sau la un vendor extern. Query-urile sunt în `docs/`.

5. **„De ce k6 doar nightly?”**
   Testele de load pe fiecare PR sunt lente și zgomotoase. Pe PR rulează smoke-ul funcțional. Load-ul rulează noaptea sau manual, iar thresholds-urile (p95, rata de erori) fac stage-ul să pice.

## Java → C#: diferențele care contează

| Java | C# |
|---|---|
| `String`, `boolean` | `string`, `bool` |
| `List<String> x = new ArrayList<>();` | `var x = new List<string>();` |
| getter/setter | proprietăți: `public string Name { get; set; }` |
| `record Pet(...)` (Java 16+) | `record Pet(...)` + `with { Status = "sold" }` |
| `CompletableFuture<T>` | `Task<T>` + `async` / `await` |
| Streams: `.stream().filter().map()` | LINQ: `.Where().Select()` |
| `@Test`, `@BeforeEach` (JUnit/TestNG) | `[Test]`, `[SetUp]`, `[TestCase(...)]` (NUnit) |
| `try-with-resources` | `using var client = ...;` |
| Maven `pom.xml` | `.csproj` + NuGet |
| `mvn test` | `dotnet test` |

## Rezultatele rulării (10.10.2026, local, Windows)

| Suită | Rezultat |
|---|---|
| Playwright: API + UI pe Chromium și Firefox | **15/15 trecute** (8,9 s); **45/45** la `--repeat-each=3`, fără niciun test flaky |
| C# NUnit: Refit + RestSharp | **11/11 trecute** (4 s), stabil la 3 rulări consecutive; testul „Before” e `Explicit`, deci sărit intenționat |
| k6 smoke (2 VU × 30 s) | **toate thresholds trecute**: p95 = 133 ms, p99 = 134 ms, 0% erori, 132 de request-uri |
