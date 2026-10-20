import fs from 'node:fs';import assert from 'node:assert/strict';
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const build=JSON.parse(fs.readFileSync('.aba.local/qa/build-v19-clinical-header-safe.json'));assert.equal(build.exitCode,0);
let source=fs.readFileSync('tests/e2e/r5.clinical-header-v18.spec.mjs','utf8').replaceAll('v18','v19').replaceAll('V18','V19').replace('l0-2sMKM0qkKmQ4Hqj_Wi',build.buildId);
fs.writeFileSync('tests/e2e/r5.clinical-header-v19.spec.mjs',source,{flag:'wx'});
fs.writeFileSync('playwright.clinical-header-v19.config.ts',fs.readFileSync('playwright.clinical-header-v18.config.ts','utf8').replaceAll('v18','v19'),{flag:'wx'});
console.log(JSON.stringify({buildId:build.buildId,candidate:'V19',priorTestsRetained:true}));
