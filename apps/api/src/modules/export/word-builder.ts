import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportForExport = {
  id: string;
  frameworkCode: string;
  selectedTests: string[];
  consultationReason: string | null;
  patient: { name: string; birthDate: Date | null; gender: string | null };
  author: { name: string; title: string | null; registrationNumber: string | null };
  organization: { name: string; subtitle: string | null };
  sections: Array<{ sectionType: string; content: string | null }>;
  clinicalConclusion: { content: string } | null;
  annexTables?: {
    wechslerIndices: Array<{ testCode: string; slotName: string; standardScore: number | null; percentile: number | null; descriptor: string | null }>;
    wechslerSubtests: Array<{ testCode: string; slotName: string; scaledScore: number | null; descriptor: string | null }>;
    battery: Array<{ testCode: string; slotName: string; score: number | null; scoreType: string; descriptor: string | null }>;
    questionnaires: Array<{ testCode: string; slotName: string; rawScore: number | null; classification: string | null }>;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_ORDER: Array<{ type: string; title: string }> = [
  { type: 'CONSULTATION_REASON', title: '2. Motivo de Consulta' },
  { type: 'BACKGROUND', title: '3. Antecedentes Relevantes' },
  { type: 'PROCEDURE_TESTS', title: '4. Procedimiento y Pruebas Aplicadas' },
  { type: 'OBSERVED_BEHAVIOR', title: '5a. Conducta Observada' },
  { type: 'QUESTIONNAIRE_SYMPTOMS', title: '5b. Sintomatología en Cuestionarios' },
  { type: 'COGNITIVE_EVALUATION', title: '5c. Evaluación Cognitiva' },
  { type: 'SOCIAL_COGNITION', title: '5d. Cognición Social' },
  { type: 'RESULTS_SYNTHESIS', title: '6. Síntesis de Resultados' },
];

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 80 },
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 160 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function hr(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { before: 200, after: 200 },
    children: [],
  });
}

function simpleTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map((h) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22 })] })],
        width: { size: Math.round(9000 / headers.length), type: WidthType.DXA },
      }),
    ),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: cell ?? '', size: 22 })] })],
          }),
        ),
      }),
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildWordDocument(report: ReportForExport): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  const today = formatDate(new Date());

  // ── Cover / header ──────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: report.organization.name, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  );
  if (report.organization.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: report.organization.subtitle, size: 24, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );
  }
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'INFORME NEUROPSICOLÓGICO', bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );
  children.push(hr());

  // ── Section 1: Datos de identificación ─────────────────────────────────────
  children.push(heading1('1. Datos de Identificación'));
  const idData: [string, string][] = [
    ['Nombre', report.patient.name],
    ['Fecha de nacimiento', formatDate(report.patient.birthDate)],
    ['Género', report.patient.gender ?? '—'],
    ['Marco de evaluación', report.frameworkCode === 'SNP_CHC' ? 'SNP-CHC (infanto-juvenil)' : 'Estándar por funciones (adultos)'],
    ['Evaluador/a', report.author.name + (report.author.title ? `, ${report.author.title}` : '')],
    ['Fecha del informe', today],
  ];
  for (const [label, value] of idData) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 24 }),
        new TextRun({ text: value, size: 24 }),
      ],
      spacing: { after: 80 },
    }));
  }

  // ── Content sections (2–6) ──────────────────────────────────────────────────
  const sectionMap = new Map(report.sections.map((s) => [s.sectionType, s.content]));

  for (const { type, title } of SECTION_ORDER) {
    if (type === 'SOCIAL_COGNITION' && report.frameworkCode !== 'SNP_CHC') continue;

    const content = sectionMap.get(type);
    if (!content?.trim()) continue;

    children.push(heading1(title));
    const paragraphs = content.split(/\n\n+/).filter(Boolean);
    for (const p of paragraphs) {
      children.push(body(p.trim()));
    }
  }

  // ── Section 7: Conclusiones ─────────────────────────────────────────────────
  if (report.clinicalConclusion?.content?.trim()) {
    children.push(heading1('7. Conclusiones'));
    const parts = report.clinicalConclusion.content.split(/\n\n+/).filter(Boolean);
    for (const p of parts) {
      children.push(body(p.trim()));
    }
  }

  // ── Section 8: Recomendaciones ──────────────────────────────────────────────
  const recoContent = sectionMap.get('RECOMMENDATIONS');
  if (recoContent?.trim()) {
    children.push(heading1('8. Recomendaciones'));
    const parts = recoContent.split(/\n\n+/).filter(Boolean);
    for (const p of parts) children.push(body(p.trim()));
  }

  // ── Section 9: Anexos ──────────────────────────────────────────────────────
  if (report.annexTables) {
    const at = report.annexTables;
    children.push(heading1('9. Anexos'));

    if (at.wechslerIndices.length > 0) {
      children.push(heading2('Índices Compuestos'));
      children.push(
        simpleTable(
          ['Test', 'Índice', 'SS', 'Pc', 'Descriptor'],
          at.wechslerIndices.map((r) => [
            r.testCode, r.slotName,
            r.standardScore != null ? String(r.standardScore) : '—',
            r.percentile != null ? String(Math.round(r.percentile)) : '—',
            r.descriptor ?? '—',
          ]),
        ),
      );
    }

    if (at.wechslerSubtests.length > 0) {
      children.push(heading2('Subtests'));
      children.push(
        simpleTable(
          ['Test', 'Subtest', 'Escalar', 'Descriptor'],
          at.wechslerSubtests.map((r) => [
            r.testCode, r.slotName,
            r.scaledScore != null ? String(r.scaledScore) : '—',
            r.descriptor ?? '—',
          ]),
        ),
      );
    }

    if (at.battery.length > 0) {
      children.push(heading2('Batería Neuropsicológica'));
      children.push(
        simpleTable(
          ['Test', 'Medida', 'Puntaje', 'Tipo', 'Descriptor'],
          at.battery.map((r) => [
            r.testCode, r.slotName,
            r.score != null ? String(r.score) : '—',
            r.scoreType,
            r.descriptor ?? '—',
          ]),
        ),
      );
    }

    if (at.questionnaires.length > 0) {
      children.push(heading2('Cuestionarios'));
      children.push(
        simpleTable(
          ['Cuestionario', 'Escala', 'Puntaje', 'Clasificación'],
          at.questionnaires.map((r) => [
            r.testCode, r.slotName,
            r.rawScore != null ? String(r.rawScore) : '—',
            r.classification ?? '—',
          ]),
        ),
      );
    }
  }

  // ── Signature block ─────────────────────────────────────────────────────────
  children.push(hr());
  children.push(new Paragraph({
    children: [new TextRun({ text: report.author.name, bold: true, size: 24 })],
    spacing: { before: 400, after: 40 },
  }));
  if (report.author.title) {
    children.push(new Paragraph({
      children: [new TextRun({ text: report.author.title, size: 22 })],
      spacing: { after: 40 },
    }));
  }
  if (report.author.registrationNumber) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Reg. ${report.author.registrationNumber}`, size: 22 })],
      spacing: { after: 40 },
    }));
  }
  children.push(new Paragraph({
    children: [new TextRun({ text: today, size: 22, color: '666666' })],
    spacing: { after: 40 },
  }));

  const doc = new Document({
    creator: 'Mirai — Neuropsia',
    title: `Informe Neuropsicológico — ${report.patient.name}`,
    description: 'Generado por el sistema Mirai',
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
