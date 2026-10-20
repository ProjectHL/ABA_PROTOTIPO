import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, localStatus, runCli } from './local/write-env.mjs';

// Mechanical schema generation, not a QA suite. Never connect to a linked DB.
try {
  if (!process.versions.node.startsWith('22.')) throw new Error('Node22 required');
  localStatus(); // Check isolated project, actual loopback bindings and network.
  const generated = runCli(['--network-id', 'aba-reintegration-local', 'gen', 'types', '--local', '--schema', 'public']);
  if (!generated.includes('export type Database =') || !generated.includes('professional_profiles:')) {
    throw new Error('Unexpected generated schema');
  }
  writeFileSync(path.join(root, 'src/lib/supabase/database.types.ts'), generated.replace(/\r\n/g, '\n').trimEnd() + '\n');
  process.stdout.write('Tipos regenerados desde aba-reintegration-local/public. QA no ejecutado.\n');
} catch {
  // CLI/status buffers may contain credentials; do not dump the error object.
  process.stderr.write('No se generaron tipos: revisa Node22, CLI versionado y stack local aislado. No se hizo reset.\n');
  process.exitCode = 1;
}
