export type ProgramDesignPdfSection = {
    label: string;
    value: string | string[];
};

export type ProgramDesignPdfInput = {
    title: string;
    kind: 'Habilidad' | 'Manejo de conducta';
    measurementDimension: string;
    sections: ProgramDesignPdfSection[];
};

const dimensionLabels: Record<string, string> = {
    percentage: 'Porcentaje',
    frequency: 'Frecuencia',
    interval: 'Intervalos',
    duration: 'Duración',
    latency: 'Latencia',
};

function safeFileName(value: string) {
    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    return normalized || 'programa';
}

function sectionLines(value: string | string[]) {
    if (Array.isArray(value)) {
        const entries = value.map((entry) => entry.trim()).filter(Boolean);
        return entries.length ? entries.map((entry) => `- ${entry}`) : ['Sin información registrada.'];
    }

    return [value.trim() || 'Sin información registrada.'];
}

export async function downloadProgramDesignPdf(input: ProgramDesignPdfInput, isCurrent: () => boolean) {
    if (!isCurrent()) return;
    const { jsPDF } = await import('jspdf');
    if (!isCurrent()) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const ensureSpace = (height: number) => {
        if (y + height > pageHeight - 18) {
            doc.addPage();
            y = 18;
        }
    };
    const write = (text: string, size = 10, bold = false, color: [number, number, number] = [32, 39, 55]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, contentWidth) as string[];
        const lineHeight = size * 0.45 + 2;
        for (const line of lines) {
            ensureSpace(lineHeight);
            doc.text(line, margin, y);
            y += lineHeight;
        }
    };

    const title = input.title.trim() || 'Programa sin nombre';
    doc.setProperties({
        title: `Diseño de programa · ${title}`,
        subject: `Diseño ABA · ${input.kind}`,
        creator: 'ABA Admin',
    });

    write('Diseño de programa ABA', 17, true);
    write(title, 13, true);
    write(`Tipo: ${input.kind}`);
    write(`Dimensión de medición: ${dimensionLabels[input.measurementDimension] ?? input.measurementDimension}`);
    write(`Generado: ${new Date().toLocaleString('es-CL')}`);
    y += 1;
    write(
        'Borrador visible: este PDF refleja los campos mostrados en el diseñador al momento de descargarlo. La descarga no guarda ni publica cambios y no corresponde a un reporte de resultados.',
        9,
        false,
        [90, 97, 110],
    );
    y += 4;

    for (const section of input.sections) {
        ensureSpace(16);
        doc.setDrawColor(210, 214, 220);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        write(section.label, 11, true);
        for (const line of sectionLines(section.value)) write(line, 9);
        y += 3;
    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 117, 130);
        doc.text(`Diseño de programa · página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }

    if (isCurrent()) doc.save(`diseno-${safeFileName(title)}.pdf`);
}
