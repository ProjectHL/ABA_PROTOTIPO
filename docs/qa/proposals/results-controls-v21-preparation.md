# Results controls V21 — preparation only

Scope: RESULTADOS-018/019, admin A synthetic, existing own student, desktop 1440×900 and mobile 390×844. V1 excluded: root owns separate test.

Prepared `tests/e2e/r5.results-controls-v21.spec.mjs` and `playwright.results-controls-v21.config.ts`. Syntax and focused lint passed. No functional execution, Auth, fixture mutation or product/canonical edit performed by this agent.

The test guards Desktop checkout, candidate/container/host BUILD_ID 7AtdY0nw3olpUC5PDvk7o. It reads authorized before/after full program/session DTOs for own/original students, blocks any command Server Action, selects actual persisted percentage/phase/professional records, verifies exact row count, then checks SVG Y tick endpoints 0..100 → 10..90 and changed point coordinates. Enlarged chart must retain bounds, series/dot count, and closing must restore exact filters, table text and SVG point coordinates. No screenshot or artwork claim. No writes, export, correction or goal submission claimed.

Root execution, serial with other admin-a authentication:

```powershell
$env:TEMP="$PWD/.aba.local/qa/runtime-tmp"
$env:TMP=$env:TEMP
$env:ABA_QA_RESULTS_CONTROLS_V21='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe ./node_modules/@playwright/test/cli.js test --config=playwright.results-controls-v21.config.ts --project=desktop
# Only after desktop terminal; inspect journal if failure. Do not overwrite prior journal.
& ./.runtime.local/node-v22.23.2-win-x64/node.exe ./node_modules/@playwright/test/cli.js test --config=playwright.results-controls-v21.config.ts --project=mobile
```

Outputs `.aba.local/qa/results-controls-v21-{desktop,mobile}-{journal,safe}.json`; suite refuses existing output to preserve failed/terminal evidence. Full snapshot equality covers preservation, but does not substitute for every result action or profile and does not close all QA003/004/015.
