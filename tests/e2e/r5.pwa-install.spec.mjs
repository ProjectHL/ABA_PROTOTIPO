import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_PWA_INSTALL_UI !== '1', 'Instalación Windows PWA sintética local explícita');
const baseURL = 'http://localhost:3001';
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';

async function command(session, method, parameters = {}) {
  try { return await session.send(method, parameters); }
  catch { throw new Error(`CDP ${method} no disponible o rechazado; instalación PWA no acreditada`); }
}

function targetSession(parent, sessionId) {
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  const receive = event => {
    if (event.sessionId !== sessionId) return;
    let message;
    try { message = JSON.parse(event.message); } catch { return; }
    if (message.method) {
      for (const callback of listeners.get(message.method) ?? []) callback(message.params ?? {});
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(`CDP de ventana ${request.method} rechazado; detalles sensibles omitidos`));
    else request.resolve(message.result ?? {});
  };
  parent.on('Target.receivedMessageFromTarget', receive);
  return {
    on(method, callback) {
      if (!listeners.has(method)) listeners.set(method, new Set());
      listeners.get(method).add(callback);
    },
    off(method, callback) { listeners.get(method)?.delete(callback); },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP de ventana ${method} agotó el plazo; instalación PWA no acreditada`));
        }, 15000);
        pending.set(id, { resolve, reject, timer, method });
        command(parent, 'Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) })
          .catch(() => {
            if (!pending.has(id)) return;
            pending.delete(id); clearTimeout(timer);
            reject(new Error(`CDP de ventana ${method} no enviado; detalles sensibles omitidos`));
          });
      });
    },
    async close() {
      parent.off('Target.receivedMessageFromTarget', receive);
      listeners.clear();
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('La sesión QA de ventana PWA se cerró'));
      }
      pending.clear();
      await command(parent, 'Target.detachFromTarget', { sessionId }).catch(() => {});
    },
  };
}

async function attachAppTarget(browserSession, targetId, targetType) {
  const { sessionId } = await command(browserSession, 'Target.attachToTarget', { targetId, flatten: false });
  const rootSession = targetSession(browserSession, sessionId);
  if (targetType === 'page') return { page: rootSession, tab: null, pageTargetId: targetId };
  if (targetType !== 'tab') {
    await rootSession.close();
    throw new Error('PWA.launch devolvió un tipo de target no compatible');
  }
  const children = [];
  const childAttached = event => {
    if (event.targetInfo.type !== 'page') return;
    children.push({ session: targetSession(rootSession, event.sessionId), targetId: event.targetInfo.targetId });
  };
  rootSession.on('Target.attachedToTarget', childAttached);
  try {
    await rootSession.send('Target.setAutoAttach', {
      autoAttach: true, waitForDebuggerOnStart: false, flatten: false,
      filter: [{ type: 'page' }, { exclude: true }],
    });
    await expect.poll(() => children.length, { timeout: 30000, message: 'El tab PWA no expuso su página hija mediante CDP' }).toBe(1);
    return { page: children[0].session, tab: rootSession, pageTargetId: children[0].targetId };
  } catch {
    for (const child of children) await child.session.close();
    await rootSession.close();
    throw new Error('No se pudo adjuntar la página hija del tab PWA exacto; detalles omitidos');
  }
}

async function safeAppState(appTarget) {
  const evaluation = await appTarget.send('Runtime.evaluate', {
    expression: `(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const heading = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].some(element =>
        element.textContent.trim() === 'Programas logrados' && element.getBoundingClientRect().height > 0);
      return { path: location.pathname, standalone: window.matchMedia('(display-mode: standalone)').matches,
        workerControlled: Boolean(navigator.serviceWorker.controller), scope: registration?.scope ?? null,
        scriptUrl: registration?.active?.scriptURL ?? null, heading };
    })()`,
    awaitPromise: true, returnByValue: true, timeout: 10000,
  });
  if (evaluation.exceptionDetails || !evaluation.result?.value) throw new Error('La ventana PWA no entregó estado verificable; detalles omitidos');
  return evaluation.result.value;
}

async function expectAppReady(appTarget, testInfo) {
  let state; let lastError;
  try { await expect.poll(async () => {
    // Runtime can briefly lack an execution context while the actual app reloads.
    try { state = await safeAppState(appTarget); }
    catch (error) { lastError = error.message; return false; }
    return state.path === '/dashboard' && state.heading && state.standalone
      && state.workerControlled && state.scope === `${baseURL}/` && state.scriptUrl === `${baseURL}/sw.js`;
  }, { timeout: 30000, message: 'Ventana PWA no acreditó dashboard, standalone y service worker reales mediante CDP' }).toBe(true); } catch (error) {
    writeFileSync(testInfo.outputPath('pwa-safe-readiness-diagnostic.json'), JSON.stringify({ state: state ?? null, lastError: lastError ?? null }));
    await testInfo.attach('pwa-safe-readiness-diagnostic', { body: JSON.stringify({ state: state ?? null, lastError: lastError ?? null }), contentType: 'application/json' });
    throw error;
  }
  return state;
}

test('QA-011: Windows instala y lanza la PWA en ventana standalone real', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Instalación Windows real; emulación móvil no demuestra instalación Android/iOS');
  test.setTimeout(180000);
  expect(process.platform, 'Esta prueba requiere el host Windows autorizado').toBe('win32');
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(process.env.ABA_QA_BASE_URL, 'PWA debe usar el build local de producción en 3001').toBe(baseURL);
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  for (const route of ['/sw.js', '/offline.html', '/manifest.webmanifest']) {
    const asset = await request.get(`${baseURL}${route}`, { maxRedirects: 0 });
    expect(asset.status(), `Asset PWA público ${route}`).toBe(200);
    if (route === '/sw.js') expect(asset.headers()['content-type']).toMatch(/javascript/);
    if (route === '/manifest.webmanifest') expect(asset.headers()['content-type']).toMatch(/manifest|json/);
  }
  for (const route of ['/offline-workspace', '/students']) {
    const protectedRoute = await request.get(`${baseURL}${route}`, { maxRedirects: 0 });
    expect(protectedRoute.status()).toBe(307);
    expect(new URL(protectedRoute.headers().location, baseURL).pathname).toBe('/login');
  }
  const health = await request.get(`${baseURL}/api/health`);
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok', service: 'aba-clinico' });
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.apiUrl).toBe('http://127.0.0.1:54321');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const profiles = path.join(state, 'qa', 'pwa-install-profiles');
  mkdirSync(profiles, { recursive: true });
  // A unique empty profile avoids modifying or uninstalling an existing user's app.
  const profileDirectory = mkdtempSync(path.join(profiles, 'windows-'));
  let context;
  let browserSession;
  let pageSession;
  let appTarget;
  let appTab;
  try {
    context = await chromium.launchPersistentContext(profileDirectory, {
      channel: 'chrome', headless: false, baseURL, viewport: { width: 1440, height: 900 },
      serviceWorkers: 'allow', acceptDownloads: false,
    });
    const browser = context.browser();
    if (!browser) throw new Error('Chrome persistente no expuso sesión CDP de navegador');
    browserSession = await browser.newBrowserCDPSession();
    const version = await command(browserSession, 'Browser.getVersion');
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Programas logrados', exact: true })).toBeVisible();
    await expect.poll(async () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 30000 }).toBe(true);
    pageSession = await context.newCDPSession(page);
    const appManifest = await command(pageSession, 'Page.getAppManifest');
    const raw = appManifest.data ? JSON.parse(appManifest.data) : null;
    if (!raw) throw new Error('Chrome no entregó el manifiesto de aplicación local');
    expect(new URL(appManifest.url).origin).toBe(baseURL);
    expect(appManifest.errors.filter(error => error.critical)).toEqual([]);
    expect(raw.name).toBe('ABA Clínico');
    expect(raw.display).toBe('standalone');
    const startUrl = new URL(raw.start_url, appManifest.url).href;
    expect(startUrl).toBe(`${baseURL}/dashboard`);
    // Current manifest omits id; Chromium derives it from start_url.
    const manifestId = new URL(appManifest.manifest?.id ?? raw.id ?? startUrl, startUrl).href;
    expect(new URL(manifestId).origin).toBe(baseURL);
    const installability = await command(pageSession, 'Page.getInstallabilityErrors');
    expect(installability.installabilityErrors.map(error => error.errorId)).toEqual([]);
    await command(browserSession, 'PWA.install', { manifestId, installUrlOrBundleUrl: startUrl });
    const osState = await command(browserSession, 'PWA.getOsAppState', { manifestId });
    expect(Number.isFinite(osState.badgeCount)).toBe(true);
    expect(Array.isArray(osState.fileHandlers)).toBe(true);
    // CDP install defaults to a browser-tab launch preference; select the normal
    // standalone preference only for this test-created isolated app/profile.
    await command(browserSession, 'PWA.changeAppUserSettings', { manifestId, displayMode: 'standalone' });
    const launched = await command(browserSession, 'PWA.launch', { manifestId });
    expect(typeof launched.targetId).toBe('string');
    let ownTarget;
    await expect.poll(async () => {
      const targets = await command(browserSession, 'Target.getTargets', { filter: [{}] });
      ownTarget = targets.targetInfos.find(target => target.targetId === launched.targetId);
      return Boolean(ownTarget);
    }, { timeout: 30000, message: 'PWA.launch target no aparece en inventario completo CDP' }).toBe(true);
    expect(['page', 'tab']).toContain(ownTarget.type);
    if (ownTarget.type === 'page') {
      await expect.poll(async () => {
        const targets = await command(browserSession, 'Target.getTargets', { filter: [{}] });
        return targets.targetInfos.find(target => target.targetId === launched.targetId)?.url;
      }, { timeout: 30000 }).toBe(startUrl);
    }
    // The exact returned tab is a container: attach its child page rather than a
    // coincidental ordinary browser tab at the dashboard URL.
    const attachedApp = await attachAppTarget(browserSession, launched.targetId, ownTarget.type);
    appTarget = attachedApp.page;
    appTab = attachedApp.tab;
    await appTarget.send('Page.enable');
    const worker = await expectAppReady(appTarget, testInfo);
    const screenshot = await appTarget.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
    if (typeof screenshot.data !== 'string') throw new Error('Chrome no entregó PNG de la ventana PWA verificada');
    writeFileSync(testInfo.outputPath('windows-pwa-standalone-dashboard.png'), Buffer.from(screenshot.data, 'base64'));
    await testInfo.attach('windows-pwa-install-summary', { body: JSON.stringify({
      platform: 'Windows', chrome: version.product, manifestId, startUrl, targetId: launched.targetId,
      launchTargetType: ownTarget.type, childPageTargetId: attachedApp.pageTargetId,
      standalone: worker.standalone, workerControlled: worker.workerControlled, uniqueIsolatedProfile: true,
      scope: 'Windows desktop only; Android/iOS installation not tested',
    }), contentType: 'application/json' });
    await appTarget.send('Page.reload');
    await expectAppReady(appTarget, testInfo);
    // Retain only the task-created isolated profile/app for reproducible diagnostics.
    // No PWA.uninstall, profile deletion, or modification of an existing browser profile.
  } finally {
    if (appTarget) await appTarget.close();
    if (appTab) await appTab.close();
    if (pageSession) await pageSession.detach().catch(() => {});
    if (browserSession) await browserSession.detach().catch(() => {});
    if (context) await context.close();
  }
});