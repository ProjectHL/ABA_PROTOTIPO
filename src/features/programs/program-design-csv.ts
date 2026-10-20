import type { ProgramDesignPdfInput } from './program-design-pdf';

export type ProgramDesignExportContext = {
    programId: string;
    versionId: string;
    predecessorVersionId: string | null;
    expectedVersion: number;
};

type ProgramDesignCsvInput = ProgramDesignPdfInput & {
    draft: Record<string, unknown>;
    context?: ProgramDesignExportContext;
};

// Quoting alone does not prevent spreadsheets from executing formula cells.
function csvCell(value: string) {
    const safe = /^[\s\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
}

/** Export the authorized visible draft, not a persisted version or results report. */
export function downloadProgramDesignCsv(input: ProgramDesignCsvInput) {
    const rows: string[][] = [
        ['seccion', 'campo', 'valor'],
        ['exportacion', 'alcance', 'Borrador visible: no guarda ni publica cambios; no es un reporte de resultados.'],
        ['exportacion', 'generado_en', new Date().toISOString()],
        ['programa', 'titulo', input.title],
        ['programa', 'tipo', input.kind],
        ['programa', 'dimension', input.measurementDimension],
    ];
    if (input.context) {
        for (const [key, value] of Object.entries(input.context)) rows.push(['identidad', key, JSON.stringify(value)]);
    }
    for (const section of input.sections) {
        rows.push(['contenido_visible', section.label, Array.isArray(section.value) ? JSON.stringify(section.value) : section.value]);
    }
    // Preserve JSON types, empty arrays, item order and every field; never flatten
    // structured V2 data into labels or silently drop empty draft fields.
    const serialized = JSON.stringify(input.draft);
    if (!serialized) throw new Error('No se pudo serializar el borrador visible.');
    rows.push(['estructura', 'borrador_json', serialized]);
    const walk = (value: unknown, path: string) => {
        if (value !== null && typeof value === 'object' && Object.keys(value).length) {
            for (const [key, child] of Object.entries(value)) walk(child, `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
        } else {
            const encoded = JSON.stringify(value);
            if (encoded === undefined) throw new Error(`Campo no serializable: ${path}`);
            rows.push(['estructura_campo_json', path, encoded]);
        }
    };
    walk(input.draft, '');
    const filename = input.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'programa';
    const blob = new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    try {
        anchor.href = url;
        anchor.download = `diseno-${filename}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
    } finally {
        anchor.remove();
        // Let the browser start reading the Blob before releasing its URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
