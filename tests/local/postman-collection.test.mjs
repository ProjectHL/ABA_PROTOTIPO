import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const raw = readFileSync(new URL('../../postman/ABA_LOCAL_R5_READS.postman_collection.json', import.meta.url), 'utf8');
const collection = JSON.parse(raw);
const requests = collection.item.flatMap(folder => folder.item);

describe('Colección Postman R5 parcial, sin secretos ni operaciones clínicas destructivas', () => {
  it('declara formato 2.1 y cobertura parcial explícita', () => {
    expect(collection.info.schema).toBe('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    expect(collection.info.description).toContain('NO acredita QA-001–016 completa');
    expect(requests).toHaveLength(103);
  });
  it('todos los scripts tienen sintaxis JavaScript válida', () => {
    for (const entry of [collection, ...requests]) for (const event of entry.event ?? []) {
      expect(() => new vm.Script(event.script.exec.join('\n'))).not.toThrow();
    }
  });
  it('no serializa credenciales, tokens ni claves', () => {
    expect(raw).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}|sb_secret_[a-zA-Z0-9_-]+/);
    expect(collection.variable.find(row => row.key === 'qa_public_key').value).toBe('');
    for (const item of requests.filter(row => row.request.url.includes('/token?'))) {
      const body = JSON.parse(item.request.body.raw);
      expect(body.email).toMatch(/^\{\{qa_\w+_email\}\}$/);
      expect(body.password).toMatch(/^\{\{qa_\w+_password\}\}$/);
    }
  });
  it('API fija y sin writes clínicos, Storage ni chat', () => {
    expect(collection.variable.find(row => row.key === 'qa_api_url').value).toBe('http://127.0.0.1:54321');
    for (const item of requests) {
      expect(item.request.url).toMatch(/^\{\{qa_api_url\}\}\/(auth\/v1\/(token\?|logout\?)|rest\/v1\/rpc\/)/);
      expect(item.request.url).not.toMatch(/command|storage|chat|delete|dispatch/);
    }
  });
  it('cada perfil inicia y revoca su propia sesión, sin exportarla al entorno', () => {
    for (const folder of collection.item.filter(row => row.name !== 'Anon')) {
      expect(folder.item[0].request.url).toContain('/auth/v1/token?');
      expect(folder.item.at(-1).request.url).toContain('/auth/v1/logout?scope=local');
    }
    expect(raw).not.toMatch(/pm\.(environment|collectionVariables|globals)\.set/);
  });
});
