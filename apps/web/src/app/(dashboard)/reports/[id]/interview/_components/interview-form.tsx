'use client';

import { useRef, useState } from 'react';
import { apiClient, InterviewData } from '@/lib/api-client';

// ── Codificación de campos estructurados ─────────────────────────────────────
// Los campos con checkboxes/select se guardan como JSON para poder recargar
// el estado. El prompt de IA los formatea a texto legible.

interface FieldValue { selected: string[]; notes?: string }
interface SingleValue { value: string; notes?: string }

function encodeMulti(selected: string[], notes: string): string {
  return JSON.stringify({ selected, notes: notes || undefined });
}
function decodeMulti(raw?: string): FieldValue {
  if (!raw) return { selected: [], notes: '' };
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p?.selected)) return { selected: p.selected, notes: p.notes ?? '' };
  } catch {}
  return { selected: [], notes: raw }; // backward compat
}
function encodeSingle(value: string, notes: string): string {
  return JSON.stringify({ value, notes: notes || undefined });
}
function decodeSingle(raw?: string): SingleValue {
  if (!raw) return { value: '', notes: '' };
  try {
    const p = JSON.parse(raw);
    if (typeof p?.value === 'string') return { value: p.value, notes: p.notes ?? '' };
  } catch {}
  return { value: raw, notes: '' };
}

// ── Componentes de campo ──────────────────────────────────────────────────────

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-md border text-sm cursor-pointer select-none transition ${
    active
      ? 'bg-brand-600 text-white border-brand-600 font-medium'
      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
  }`;

function CheckGroup({
  label, options, value, onChange, notesPlaceholder,
}: {
  label: string; options: string[];
  value: FieldValue; onChange: (v: FieldValue) => void;
  notesPlaceholder?: string;
}) {
  const toggle = (opt: string) => {
    const next = value.selected.includes(opt)
      ? value.selected.filter(s => s !== opt)
      : [...value.selected, opt];
    onChange({ ...value, selected: next });
  };
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)} className={chip(value.selected.includes(opt))}>
            {opt}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder={notesPlaceholder ?? 'Observaciones adicionales…'}
        className="w-full border rounded-md px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400"
        value={value.notes ?? ''}
        onChange={e => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  );
}

function RadioGroup({
  label, options, value, onChange,
}: {
  label: string; options: string[];
  value: SingleValue; onChange: (v: SingleValue) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map(opt => (
          <button
            key={opt} type="button"
            onClick={() => onChange({ ...value, value: value.value === opt ? '' : opt })}
            className={chip(value.value === opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <textarea
        rows={1}
        placeholder="Observaciones adicionales…"
        className="w-full border rounded-md px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400"
        value={value.notes ?? ''}
        onChange={e => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  );
}

function DropSelect({
  label, options, value, onChange,
}: {
  label: string; options: string[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
      >
        <option value="">Sin especificar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Opciones clínicas ─────────────────────────────────────────────────────────

const OPT = {
  relationType: ['Biparental', 'Monoparental', 'Reconstituida', 'Extensa', 'Otro'],
  caregivers: ['Madre', 'Padre', 'Madrastra / Padrastro', 'Abuela/o', 'Tía/o', 'Otro cuidador'],
  psychosocial: ['Sin factores de riesgo destacables', 'Estrés económico', 'Conflicto familiar', 'Separación reciente', 'Violencia intrafamiliar', 'Pérdidas significativas', 'Red de apoyo sólida', 'Buen vínculo parental'],
  pregnancy: ['Embarazo sin complicaciones', 'Embarazo con complicaciones', 'Parto vaginal', 'Parto por cesárea', 'Parto prematuro (<37 sem)', 'Bajo peso al nacer', 'APGAR normal', 'APGAR alterado', 'Hospitalización neonatal'],
  milestones: ['Dentro de lo esperado', 'Leve retraso', 'Retraso significativo', 'Avance precoz'],
  language: ['Dentro de lo esperado', 'Retraso en primeras palabras', 'Retraso en frases', 'Retraso significativo', 'Lenguaje atípico'],
  sphincter: ['Dentro de lo esperado', 'Logrado tardíamente (>4 años)', 'Enuresis nocturna actual', 'Encopresis', 'Sin lograr control'],
  childhoodBehavior: ['Conducta adecuada para la edad', 'Inquieto/a', 'Impulsivo/a', 'Desafiante u oposicionista', 'Inhibido/a o retraído/a', 'Agresivo/a', 'Ansioso/a', 'Triste o irritable', 'Conductas repetitivas o rituales'],
  childhoodSymptoms: ['Sin síntomas destacables', 'Inatención', 'Hiperactividad', 'Dificultades del sueño', 'Dificultades en alimentación', 'Rabietas frecuentes', 'Miedos excesivos', 'Síntomas somáticos'],
  emotionalReg: ['Adecuada', 'Labilidad emocional leve', 'Labilidad emocional significativa', 'Desregulación severa'],
  authority: ['Relación adecuada', 'Tendencia a la oposición leve', 'Oposicionismo significativo', 'Sin acatamiento de normas'],
  currentSymptoms: ['Sin síntomas actuales destacables', 'Dificultades de atención', 'Hiperactividad / impulsividad', 'Dificultades de aprendizaje', 'Problemas de conducta', 'Dificultades sociales', 'Ansiedad', 'Ánimo depresivo', 'Irritabilidad', 'Dificultades del sueño', 'Dificultades del lenguaje', 'Dificultades de memoria', 'Fatiga cognitiva'],
  dailyImpact: ['Rendimiento académico', 'Relaciones con pares', 'Dinámica familiar', 'Autonomía personal', 'Actividades recreativas', 'Sueño', 'Alimentación', 'Desempeño laboral'],
  treatments: ['Sin tratamientos actuales', 'Psicoterapia individual', 'Psicoterapia familiar', 'Psiquiatría', 'Medicación (especificar)', 'Fonoaudiología', 'Terapia ocupacional', 'Psicopedagogía', 'Neurología'],
  friendships: ['Amplia red de amigos', 'Algunos amigos cercanos', 'Pocos amigos', 'Dificultades para hacer amigos', 'Prefiere estar solo/a', 'Vínculos superficiales'],
  socialNetworks: ['Familia extensa', 'Amigos del colegio/trabajo', 'Grupos de interés o deporte', 'Comunidad religiosa', 'Redes virtuales', 'Red de apoyo escasa'],
  hobbies: ['Deportes', 'Videojuegos', 'Música', 'Arte / Dibujo', 'Lectura', 'Tecnología', 'Naturaleza / Animales', 'Actividades sociales', 'Sin hobbies definidos'],
  educationLevel: ['Educación parvularia', 'Educación básica', 'Educación media', 'Enseñanza técnico-profesional', 'Enseñanza universitaria', 'Estudios de posgrado', 'Sin escolaridad formal'],
  support: ['Sin apoyos', 'PIE (Programa Integración Escolar)', 'Psicopedagogía', 'Fonoaudiología', 'Terapia ocupacional', 'Psicología escolar', 'Apoyo de docentes'],
  workSituation: ['No aplica (menor de edad)', 'Estudiante', 'Empleado/a jornada completa', 'Empleado/a media jornada', 'Independiente / Emprendedor/a', 'Desempleado/a', 'Jubilado/a o pensionado/a'],
  diagnoses: ['Sin diagnósticos previos', 'TDAH', 'TEA', 'Trastorno del aprendizaje', 'Trastorno ansioso', 'Trastorno del ánimo / Depresión', 'Trastorno del desarrollo', 'Epilepsia', 'Trastorno del sueño', 'Discapacidad intelectual', 'TEC', 'ACV'],
  hospitalizations: ['Sin antecedentes relevantes', 'Hospitalizaciones médicas', 'Cirugías', 'TEC (traumatismo encéfalo-craneano)', 'Accidentes'],
  prevEvals: ['Sin evaluaciones previas', 'Psicológica', 'Neuropsicológica', 'Neurológica', 'Psiquiátrica', 'Fonoaudiológica', 'Psicopedagógica'],
  familyHistory: ['Sin antecedentes relevantes', 'TDAH', 'TEA', 'Trastornos del aprendizaje', 'Trastornos ansiosos', 'Trastorno del ánimo / Depresión', 'Epilepsia', 'Enfermedades neurológicas', 'Discapacidad intelectual'],
};

// ── Componente principal ──────────────────────────────────────────────────────

interface Props { reportId: string; initial: InterviewData }
type S = keyof InterviewData;

export function InterviewForm({ reportId, initial }: Props) {
  function field(s: S, k: string) { return (initial[s] as any)?.[k] as string | undefined; }

  // Sección 2
  const [householdMembers, setHouseholdMembers] = useState(decodeMulti(field('section2', 'householdMembers')));
  const [relationType, setRelationType] = useState((initial.section2 as any)?.householdRelationType ?? '');
  const [caregivers, setCaregivers] = useState(decodeMulti(field('section2', 'primaryCaregivers')));
  const [psychosocial, setPsychosocial] = useState(decodeMulti(field('section2', 'psychosocialContext')));

  // Sección 3
  const [pregnancy, setPregnancy] = useState(decodeMulti(field('section3', 'pregnancyAndBirth')));
  const [milestones, setMilestones] = useState(decodeSingle(field('section3', 'psychomotorMilestones')));
  const [language, setLanguage] = useState(decodeSingle(field('section3', 'languageDevelopment')));
  const [sphincter, setSphincter] = useState((initial.section3 as any)?.sphincterControl ?? '');

  // Sección 4
  const [childhoodBehavior, setChildhoodBehavior] = useState(decodeMulti(field('section4', 'childhoodBehavior')));
  const [childhoodSymptoms, setChildhoodSymptoms] = useState(decodeMulti(field('section4', 'childhoodSymptoms')));
  const [emotionalReg, setEmotionalReg] = useState(decodeSingle(field('section4', 'emotionalRegulationChildhood')));
  const [authority, setAuthority] = useState(decodeSingle(field('section4', 'relationshipWithAuthority')));

  // Sección 5
  const [currentSymptoms, setCurrentSymptoms] = useState(decodeMulti(field('section5', 'currentSymptomsDescription')));
  const [dailyImpact, setDailyImpact] = useState(decodeMulti(field('section5', 'dailyFunctioningImpact')));
  const [treatments, setTreatments] = useState(decodeMulti(field('section5', 'currentTreatments')));

  // Sección 6
  const [friendships, setFriendships] = useState(decodeSingle(field('section6', 'currentFriendships')));
  const [socialNetworks, setSocialNetworks] = useState(decodeMulti(field('section6', 'currentSocialNetworks')));
  const [hobbies, setHobbies] = useState(decodeMulti(field('section6', 'hobbiesAndInterests')));

  // Sección 7
  const [educationLevel, setEducationLevel] = useState((initial.section7 as any)?.educationLevel ?? '');
  const [educationNotes, setEducationNotes] = useState((initial.section7 as any)?.educationNotes ?? '');
  const [support, setSupport] = useState(decodeMulti(field('section7', 'receivedSupport')));
  const [workSituation, setWorkSituation] = useState((initial.section7 as any)?.workSituation ?? '');
  const [workNotes, setWorkNotes] = useState((initial.section7 as any)?.workNotes ?? '');

  // Sección 8
  const [diagnoses, setDiagnoses] = useState(decodeMulti(field('section8', 'previousDiagnoses')));
  const [medication, setMedication] = useState((initial.section8 as any)?.currentMedication ?? '');
  const [hospitalizations, setHospitalizations] = useState(decodeMulti(field('section8', 'hospitalizationsTraumas')));
  const [prevEvals, setPrevEvals] = useState(decodeMulti(field('section8', 'previousEvaluations')));
  const [familyHistory, setFamilyHistory] = useState(decodeMulti(field('section8', 'familyMedicalHistory')));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // PDF extraction state
  const [pdfOpen, setPdfOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractSuccess, setExtractSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function buildData(): InterviewData {
    return {
      section2: {
        householdMembers: encodeMulti(householdMembers.selected, householdMembers.notes ?? ''),
        householdRelationType: relationType,
        primaryCaregivers: encodeMulti(caregivers.selected, caregivers.notes ?? ''),
        psychosocialContext: encodeMulti(psychosocial.selected, psychosocial.notes ?? ''),
      },
      section3: {
        pregnancyAndBirth: encodeMulti(pregnancy.selected, pregnancy.notes ?? ''),
        psychomotorMilestones: encodeSingle(milestones.value, milestones.notes ?? ''),
        languageDevelopment: encodeSingle(language.value, language.notes ?? ''),
        sphincterControl: sphincter,
      },
      section4: {
        childhoodBehavior: encodeMulti(childhoodBehavior.selected, childhoodBehavior.notes ?? ''),
        childhoodSymptoms: encodeMulti(childhoodSymptoms.selected, childhoodSymptoms.notes ?? ''),
        emotionalRegulationChildhood: encodeSingle(emotionalReg.value, emotionalReg.notes ?? ''),
        relationshipWithAuthority: encodeSingle(authority.value, authority.notes ?? ''),
      },
      section5: {
        currentSymptomsDescription: encodeMulti(currentSymptoms.selected, currentSymptoms.notes ?? ''),
        dailyFunctioningImpact: encodeMulti(dailyImpact.selected, dailyImpact.notes ?? ''),
        currentTreatments: encodeMulti(treatments.selected, treatments.notes ?? ''),
      },
      section6: {
        currentFriendships: encodeSingle(friendships.value, friendships.notes ?? ''),
        currentSocialNetworks: encodeMulti(socialNetworks.selected, socialNetworks.notes ?? ''),
        hobbiesAndInterests: encodeMulti(hobbies.selected, hobbies.notes ?? ''),
      },
      section7: {
        educationLevel,
        educationNotes,
        receivedSupport: encodeMulti(support.selected, support.notes ?? ''),
        workSituation,
        workNotes,
      } as any,
      section8: {
        previousDiagnoses: encodeMulti(diagnoses.selected, diagnoses.notes ?? ''),
        currentMedication: medication,
        hospitalizationsTraumas: encodeMulti(hospitalizations.selected, hospitalizations.notes ?? ''),
        previousEvaluations: encodeMulti(prevEvals.selected, prevEvals.notes ?? ''),
        familyMedicalHistory: encodeMulti(familyHistory.selected, familyHistory.notes ?? ''),
      },
    };
  }

  async function handleSave() {
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      await apiClient.upsertInterview(reportId, buildData());
      setSaved(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExtractPdf(file: File) {
    setExtracting(true); setExtractError(''); setExtractSuccess(false);
    try {
      const { extracted } = await apiClient.extractInterviewFromPdf(reportId, file);
      // Hydrate state from extracted data (best-effort)
      const s = extracted as any;
      if (s.section2?.householdMembers) setHouseholdMembers(decodeMulti(s.section2.householdMembers));
      if (s.section2?.householdRelationType) setRelationType(s.section2.householdRelationType);
      if (s.section2?.primaryCaregivers) setCaregivers(decodeMulti(s.section2.primaryCaregivers));
      if (s.section2?.psychosocialContext) setPsychosocial(decodeMulti(s.section2.psychosocialContext));
      if (s.section3?.pregnancyAndBirth) setPregnancy(decodeMulti(s.section3.pregnancyAndBirth));
      if (s.section3?.psychomotorMilestones) setMilestones(decodeSingle(s.section3.psychomotorMilestones));
      if (s.section3?.languageDevelopment) setLanguage(decodeSingle(s.section3.languageDevelopment));
      if (s.section3?.sphincterControl) setSphincter(s.section3.sphincterControl);
      if (s.section4?.childhoodBehavior) setChildhoodBehavior(decodeMulti(s.section4.childhoodBehavior));
      if (s.section4?.childhoodSymptoms) setChildhoodSymptoms(decodeMulti(s.section4.childhoodSymptoms));
      if (s.section4?.emotionalRegulationChildhood) setEmotionalReg(decodeSingle(s.section4.emotionalRegulationChildhood));
      if (s.section4?.relationshipWithAuthority) setAuthority(decodeSingle(s.section4.relationshipWithAuthority));
      if (s.section5?.currentSymptomsDescription) setCurrentSymptoms(decodeMulti(s.section5.currentSymptomsDescription));
      if (s.section5?.dailyFunctioningImpact) setDailyImpact(decodeMulti(s.section5.dailyFunctioningImpact));
      if (s.section5?.currentTreatments) setTreatments(decodeMulti(s.section5.currentTreatments));
      if (s.section6?.currentFriendships) setFriendships(decodeSingle(s.section6.currentFriendships));
      if (s.section6?.currentSocialNetworks) setSocialNetworks(decodeMulti(s.section6.currentSocialNetworks));
      if (s.section6?.hobbiesAndInterests) setHobbies(decodeMulti(s.section6.hobbiesAndInterests));
      if (s.section7?.educationLevel) setEducationLevel(s.section7.educationLevel);
      if (s.section7?.receivedSupport) setSupport(decodeMulti(s.section7.receivedSupport));
      if (s.section7?.workSituation) setWorkSituation(s.section7.workSituation);
      if (s.section8?.previousDiagnoses) setDiagnoses(decodeMulti(s.section8.previousDiagnoses));
      if (s.section8?.currentMedication) setMedication(s.section8.currentMedication);
      if (s.section8?.hospitalizationsTraumas) setHospitalizations(decodeMulti(s.section8.hospitalizationsTraumas));
      if (s.section8?.previousEvaluations) setPrevEvals(decodeMulti(s.section8.previousEvaluations));
      if (s.section8?.familyMedicalHistory) setFamilyHistory(decodeMulti(s.section8.familyMedicalHistory));
      setExtractSuccess(true); setSaved(false);
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Error al procesar el PDF.');
    } finally {
      setExtracting(false);
    }
  }

  const sec = (title: string, children: React.ReactNode) => (
    <section className="border rounded-lg p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="space-y-6">

      {/* ── Opción PDF ─────────────────────────────────────────── */}
      <div className="border border-dashed border-brand-300 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setPdfOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-brand-50 hover:bg-brand-100 transition text-sm font-medium text-brand-700">
          <span>📄 Subir ficha de anamnesis en PDF para pre-completar el formulario</span>
          <span className="text-brand-400 text-xs">{pdfOpen ? '▲ Ocultar' : '▼ Expandir'}</span>
        </button>
        {pdfOpen && (
          <div className="px-5 py-4 space-y-3 bg-white">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              El PDF debe contener texto seleccionable. Si fue completado a mano, use el formulario directamente.
            </p>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleExtractPdf(f); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={extracting}
                className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {extracting ? 'Extrayendo…' : 'Seleccionar PDF'}
              </button>
              {extracting && <span className="text-xs text-gray-400">Procesando con IA…</span>}
            </div>
            {extractError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{extractError}</p>}
            {extractSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">✓ Datos cargados. Revise y corrija antes de guardar.</p>}
          </div>
        )}
      </div>

      {/* ── Sección 2: Contexto familiar ───────────────────────── */}
      {sec('Contexto familiar', <>
        <CheckGroup label="Composición del hogar" options={['Madre', 'Padre', 'Madrastra / Padrastro', 'Hermanos/as', 'Abuelos/as', 'Tíos/as', 'Solo con el/la paciente', 'Otro']}
          value={householdMembers} onChange={setHouseholdMembers} notesPlaceholder="Detalles adicionales de la composición…" />
        <DropSelect label="Tipo de relación parental" options={OPT.relationType} value={relationType} onChange={setRelationType} />
        <CheckGroup label="Cuidadores principales" options={OPT.caregivers} value={caregivers} onChange={setCaregivers} notesPlaceholder="Especificar roles o situación…" />
        <CheckGroup label="Contexto psicosocial (factores relevantes)" options={OPT.psychosocial} value={psychosocial} onChange={setPsychosocial} notesPlaceholder="Otros factores relevantes…" />
      </>)}

      {/* ── Sección 3: Historia del desarrollo ─────────────────── */}
      {sec('Historia del desarrollo', <>
        <CheckGroup label="Embarazo y nacimiento" options={OPT.pregnancy} value={pregnancy} onChange={setPregnancy} notesPlaceholder="Detalles adicionales (ej: semanas de gestación, peso al nacer)…" />
        <RadioGroup label="Hitos psicomotores" options={OPT.milestones} value={milestones} onChange={setMilestones} />
        <RadioGroup label="Desarrollo del lenguaje" options={OPT.language} value={language} onChange={setLanguage} />
        <DropSelect label="Control de esfínteres" options={OPT.sphincter} value={sphincter} onChange={setSphincter} />
      </>)}

      {/* ── Sección 4: Conducta en la infancia ─────────────────── */}
      {sec('Conducta y sintomatología en la infancia', <>
        <CheckGroup label="Conducta en la infancia" options={OPT.childhoodBehavior} value={childhoodBehavior} onChange={setChildhoodBehavior} />
        <CheckGroup label="Sintomatología en la infancia" options={OPT.childhoodSymptoms} value={childhoodSymptoms} onChange={setChildhoodSymptoms} />
        <RadioGroup label="Regulación emocional" options={OPT.emotionalReg} value={emotionalReg} onChange={setEmotionalReg} />
        <RadioGroup label="Relación con la autoridad" options={OPT.authority} value={authority} onChange={setAuthority} />
      </>)}

      {/* ── Sección 5: Sintomatología actual ───────────────────── */}
      {sec('Sintomatología actual', <>
        <CheckGroup label="Síntomas actuales" options={OPT.currentSymptoms} value={currentSymptoms} onChange={setCurrentSymptoms} notesPlaceholder="Descripción adicional de los síntomas…" />
        <CheckGroup label="Áreas de funcionamiento afectadas" options={OPT.dailyImpact} value={dailyImpact} onChange={setDailyImpact} />
        <CheckGroup label="Tratamientos o intervenciones actuales" options={OPT.treatments} value={treatments} onChange={setTreatments} notesPlaceholder="Especificar (nombre de medicación, frecuencia, etc.)…" />
      </>)}

      {/* ── Sección 6: Desarrollo social e intereses ───────────── */}
      {sec('Desarrollo social e intereses', <>
        <RadioGroup label="Vínculos de amistad actuales" options={OPT.friendships} value={friendships} onChange={setFriendships} />
        <CheckGroup label="Redes de apoyo social" options={OPT.socialNetworks} value={socialNetworks} onChange={setSocialNetworks} />
        <CheckGroup label="Hobbies e intereses" options={OPT.hobbies} value={hobbies} onChange={setHobbies} notesPlaceholder="Otros intereses…" />
      </>)}

      {/* ── Sección 7: Historia escolar / laboral ──────────────── */}
      {sec('Historia escolar / laboral', <>
        <div className="grid grid-cols-2 gap-4">
          <DropSelect label="Nivel educacional" options={OPT.educationLevel} value={educationLevel} onChange={setEducationLevel} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especificar (curso, carrera, etc.)</label>
            <input value={educationNotes} onChange={e => setEducationNotes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="Ej: 3° medio, Ingeniería Civil…" />
          </div>
        </div>
        <CheckGroup label="Apoyos recibidos" options={OPT.support} value={support} onChange={setSupport} />
        <div className="grid grid-cols-2 gap-4">
          <DropSelect label="Situación laboral" options={OPT.workSituation} value={workSituation} onChange={setWorkSituation} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especificar</label>
            <input value={workNotes} onChange={e => setWorkNotes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="Cargo, empresa, área…" />
          </div>
        </div>
      </>)}

      {/* ── Sección 8: Antecedentes médicos ────────────────────── */}
      {sec('Antecedentes médicos', <>
        <CheckGroup label="Diagnósticos previos" options={OPT.diagnoses} value={diagnoses} onChange={setDiagnoses} notesPlaceholder="Especificar (edad de diagnóstico, profesional que diagnosticó…)" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medicación actual</label>
          <input value={medication} onChange={e => setMedication(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="Nombre del fármaco + dosis (ej: Metilfenidato 10 mg, 1 comp/día)…" />
        </div>
        <CheckGroup label="Hospitalizaciones, cirugías o traumatismos" options={OPT.hospitalizations} value={hospitalizations} onChange={setHospitalizations} notesPlaceholder="Describir (año, causa, secuelas)…" />
        <CheckGroup label="Evaluaciones previas" options={OPT.prevEvals} value={prevEvals} onChange={setPrevEvals} notesPlaceholder="Especificar (año, resultado, institución)…" />
        <CheckGroup label="Antecedentes médicos familiares" options={OPT.familyHistory} value={familyHistory} onChange={setFamilyHistory} notesPlaceholder="Especificar parentesco y condición…" />
      </>)}

      {/* ── Guardar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar antecedentes'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado ✓</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}
