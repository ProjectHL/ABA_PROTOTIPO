import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const committedPath = fileURLToPath(new URL('../src/lib/supabase/database.types.ts', import.meta.url));

const generated = spawnSync(process.execPath, [cli, 'gen', 'types', '--local', '--schema', 'public'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024,
});

if (generated.status !== 0) {
  process.stderr.write(generated.stderr || 'Supabase type generation failed.\n');
  process.exit(generated.status ?? 1);
}

const normalize = (value) =>
  value
    .replace(/\r\n/g, '\n')
    // The hosted generator includes its PostgREST version while the local
    // generator currently omits it. This metadata is not part of the DB contract.
    .replace(
      /\n  \/\/ Allows to automatically instantiate createClient[^\n]*\n  \/\/ instead of createClient[^\n]*\n  __InternalSupabase: \{\n    PostgrestVersion: "[^"]+"\n  \}/,
      '',
    )
    .trimEnd();
const committed = normalize(readFileSync(committedPath, 'utf8'));
const actual = normalize(generated.stdout);

if (actual !== committed) {
  process.stderr.write(
    'Supabase types are out of date. Run the local stack, regenerate database.types.ts, and review the schema change.\n',
  );
  process.exit(1);
}

process.stdout.write('Supabase generated types match src/lib/supabase/database.types.ts.\n');
