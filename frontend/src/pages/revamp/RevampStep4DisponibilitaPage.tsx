import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, Info, Plus, Save, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { createRevampApplicationDraft, getMyLatestRevampApplication, getRevampApplicationSections, saveRevampApplicationSection, uploadRevampAttachment, type AttachmentUploadResult, type RevampSectionSnapshot } from "../../api/revampApplicationApi";
import { loadRevampApplicationIdForRegistry, saveRevampApplicationIdForRegistry } from "../../utils/revampApplicationSession";
import { clearRevampIntegrationEditSession, integrationEditHasAnyCode, isRevampIntegrationEditFor, loadRevampIntegrationEditSession } from "../../utils/revampIntegrationEditSession";
import { completeRevampIntegrationEdit } from "../../utils/revampIntegrationCompletion";
import { loadRevampFcrEditSession } from "../../utils/revampFcrEditSession";
import { useFcrEditMode } from "../../hooks/useFcrEditMode";
import { FcrSubmitBar } from "../../components/supplier/FcrSubmitBar";

const NAVY  = "#0f2a52";
const GREEN = "#1a5c3a";
const MUTED = "#6b7280";
const ERR   = "#dc2626";

const STEPS = ["Anagrafica", "Tipologia", "Competenze", "Disponibilità", "Dichiarazioni"];

/* ─── shared options ─────────────────────────────── */
const ANNI_DOC = [
  { value: "meno1",   label: "Meno di 1" },
  { value: "1_5",     label: "1–5" },
  { value: "6_10",    label: "6–10" },
  { value: "11_15",   label: "11–15" },
  { value: "oltre16", label: "Oltre 16" },
];

const ANNI_PROF = [
  { value: "meno1",   label: "Meno di 1 anno" },
  { value: "1_5",     label: "1–5 anni" },
  { value: "6_10",    label: "6–10 anni" },
  { value: "11_15",   label: "11–15 anni" },
  { value: "oltre16", label: "Oltre 16 anni" },
];

const REGIONI_IT = [
  "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna",
  "Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche",
  "Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana",
  "Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto",
];

/* ─── 3A: aree tematiche ─────────────────────────── */
type AreaItem = { id: string; label: string };
export const AREE_TEMATICHE: AreaItem[] = [
  { id: "digitale_base",  label: "Competenze digitali di base" },
  { id: "digitale_adv",   label: "Competenze digitali avanzate e specialistiche" },
  { id: "lingue",         label: "Lingue straniere / Italiano per stranieri" },
  { id: "soft_skills",    label: "Soft skills e life skills" },
  { id: "outdoor",        label: "Formazione outdoor / esperienziale" },
  { id: "hr",             label: "Human Resources" },
  { id: "manageriale",    label: "Formazione manageriale" },
  { id: "sistemi",        label: "Sistemi di gestione (ISO 9001, SA8000, ecc.)" },
  { id: "comunicazione",  label: "Comunicazione, marketing e social media" },
  { id: "grafica",        label: "Grafica e design" },
  { id: "ssl_ob",         label: "Salute e Sicurezza sul lavoro — obbligatoria" },
  { id: "ssl_nob",        label: "Salute e Sicurezza sul lavoro — non obbligatoria" },
  { id: "giuridico",      label: "Giuridico" },
  { id: "fondi_eu",       label: "Gestione Fondi Strutturali EU" },
  { id: "economico",      label: "Economico / finanziario" },
  { id: "commercio",      label: "Commercio e vendita" },
  { id: "pm",             label: "Project Management" },
  { id: "green",          label: "Green economy / sostenibilità ambientale" },
  { id: "sanita",         label: "Sanità / socio-assistenziale" },
  { id: "logistica",      label: "Logistica e trasporti" },
  { id: "agricoltura",    label: "Agricoltura" },
  { id: "turismo",        label: "Turismo ed enogastronomia" },
  { id: "tecnico_prof",   label: "Formazione tecnico-professionale" },
  { id: "audiovisivo",    label: "Audiovisivo e spettacolo" },
  { id: "cultura",        label: "Cultura e beni culturali" },
  { id: "scolastico",     label: "Formazione in contesti scolastici" },
  { id: "altro_area",     label: "Altro (specificare ambito e tematiche)" },
];

/* ─── D helpers ──────────────────────────────────── */
function fmtMonthYear(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}
function isValidMonthYear(v: string): boolean {
  if (!/^\d{2}\/\d{4}$/.test(v)) return false;
  const mm = parseInt(v.slice(0, 2), 10);
  return mm >= 1 && mm <= 12;
}
function monthYearToNum(v: string): number {
  const [mm, yyyy] = v.split("/");
  return parseInt(yyyy, 10) * 12 + parseInt(mm, 10);
}
function isToBeforeFrom(from: string, to: string): boolean {
  if (!isValidMonthYear(from) || !isValidMonthYear(to)) return false;
  return monthYearToNum(to) < monthYearToNum(from);
}

const MODALITA_EROGAZIONE = [
  { value: "presenza",  label: "In presenza" },
  { value: "online_s",  label: "Online sincrona" },
  { value: "online_a",  label: "Online asincrona" },
  { value: "blended",   label: "Blended" },
];

const SETTORI_COMMITTENTE = [
  { value: "pa",             label: "Pubblica Amministrazione" },
  { value: "manifatturiero", label: "Manifatturiero" },
  { value: "terziario",      label: "Terziario" },
  { value: "no_profit",      label: "No Profit / Terzo Settore" },
  { value: "formazione",     label: "Formazione" },
  { value: "sanita",         label: "Sanità" },
  { value: "altro",          label: "Altro" },
];

type Esperienza = {
  committente: string; settore: string;
  tipoIntTesto: string; ambitoTematico: string;
  periodoFrom: string; periodoTo: string;
  durata: string; modalita: string;
  finanziata: string; fondoProgramma: string;
};

function mkEsp(): Esperienza {
  return { committente: "", settore: "", tipoIntTesto: "", ambitoTematico: "", periodoFrom: "", periodoTo: "", durata: "", modalita: "", finanziata: "", fondoProgramma: "" };
}

const AMBITI_CONSULENZA = [
  "Orientamento professionale", "Accompagnamento al lavoro", "Coaching",
  "Assistenza tecnica ai programmi comunitari e nazionali", "Business Plan e creazione d'impresa",
  "Change management", "Consulenza aziendale e di direzione", "Gestione risorse umane",
  "Direzione e coordinamento", "Monitoraggio e valutazione", "Progettazione fondi EU",
  "Progettazione formativa", "Rendicontazione", "Ricerca sociale e di mercato", "Tutoraggio",
];

/* ─── 3B: servizi per tipologia ─────────────────── */
const SERVIZI_MAP: Record<string, string[]> = {
  cdo_lavoro:     ["Payroll e amministrazione", "Gestione contratti e rapporti di lavoro", "Contenzioso e controversie", "Welfare aziendale", "Applicazione CCNL", "Somministrazione"],
  commercialista: ["Contabilità e bilancio", "Fiscalità d'impresa", "Finanza agevolata e crediti d'imposta", "Valutazione d'azienda"],
  avvocato:       ["Diritto del lavoro", "Contrattualistica commerciale", "Privacy e GDPR", "Terzo settore", "Diritto societario", "Contenziosi"],
  psicologo:      ["Assessment individuale e di gruppo", "Outplacement", "Sviluppo leadership", "Counseling"],
  finanza:        ["Bandi regionali e nazionali", "Fondi strutturali europei", "Credito d'imposta R&S e formazione", "Finanza alternativa"],
  orientatore:    ["Bilancio di competenze", "Counseling di carriera", "Orientamento e Accompagnamento al lavoro"],
};

/* ─── types ──────────────────────────────────────── */
type AreaEntry = { specifica: string; anni: string };
type AreaState = { checked: boolean; entries: AreaEntry[] };
type AreasMap  = Record<string, AreaState>;

function initAree(): AreasMap {
  return Object.fromEntries(AREE_TEMATICHE.map(a => [a.id, { checked: false, entries: [{ specifica: "", anni: "" }] }]));
}

/* ─── shared ui helpers ──────────────────────────── */
type OC  = (e: ChangeEvent<HTMLInputElement>)    => void;
type OCT = (e: ChangeEvent<HTMLTextAreaElement>) => void;
type OCS = (e: ChangeEvent<HTMLSelectElement>)   => void;

const s_input = (err?: boolean): React.CSSProperties => ({
  width: "100%", padding: "9px 11px", fontSize: "0.86rem",
  border: `1.5px solid ${err ? ERR : "#d1d5db"}`, borderRadius: 6,
  outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff",
});
const s_textarea = (err?: boolean): React.CSSProperties => ({
  ...s_input(err), resize: "vertical" as const, minHeight: 68, fontFamily: "inherit",
});
const COL: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const LBL: React.CSSProperties = { fontSize: "0.77rem", fontWeight: 600, color: "#374151" };
const HINT: React.CSSProperties = { fontWeight: 400, color: MUTED };
const ERRTXT: React.CSSProperties = { fontSize: "0.73rem", color: ERR };

function FileUpload({ label, required, hint, uploading = false, result = null, onSelect }: {
  label: string; required?: boolean; hint?: string;
  uploading?: boolean; result?: AttachmentUploadResult | null;
  onSelect: (f: File) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div style={COL}>
      <span style={{ ...LBL, display: "flex", alignItems: "center", gap: 4 }}>
        {label}{required && <span style={{ color: ERR }}> *</span>}
        {hint && <span style={HINT}> — {hint}</span>}
      </span>
      <div onClick={() => !uploading && ref.current?.click()}
        style={{ border: "1.5px dashed #d1d5db", borderRadius: 6, padding: "14px 16px", cursor: uploading ? "default" : "pointer", background: result ? "#f0fdf4" : "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
        <Upload size={16} color={result ? "#16a34a" : "#9ca3af"} />
        {uploading
          ? <span style={{ fontSize: "0.82rem", color: MUTED }}>Caricamento in corso...</span>
          : result
            ? <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>✓ {result.fileName}</span>
            : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>Clicca per caricare — PDF max 5 MB</span>}
      </div>
      <input ref={ref} type="file" accept=".pdf" style={{ display: "none" }} disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(f); }} />
    </div>
  );
}

function Field({ label, required, value, onChange, onBlur, error, placeholder, type = "text", hint, tooltip }: {
  label: string; required?: boolean; value: string; onChange: OC; onBlur?: () => void;
  error?: string; placeholder?: string; type?: string; hint?: string; tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={COL}>
      <span style={{ ...LBL, display: "flex", alignItems: "center", gap: 4 }}>
        {label}{required && <span style={{ color: ERR }}> *</span>}
        {hint && <span style={HINT}> — {hint}</span>}
        {tooltip && (
          <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <Info size={12} style={{ color: MUTED, cursor: "help" }} />
            {showTip && (
              <span style={{
                position: "absolute", bottom: "calc(100% + 4px)", left: "50%",
                transform: "translateX(-50%)", background: "#1f2937", color: "#fff",
                fontSize: "0.72rem", padding: "4px 8px", borderRadius: 4,
                whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100,
              }}>{tooltip}</span>
            )}
          </span>
        )}
      </span>
      <input type={type} placeholder={placeholder ?? ""} value={value} onChange={onChange} onBlur={onBlur} style={s_input(!!error)} />
      {error && <span style={ERRTXT}>{error}</span>}
    </div>
  );
}

function Textarea({ label, required, value, onChange, error, placeholder, hint, rows = 3 }: {
  label: string; required?: boolean; value: string; onChange: OCT;
  error?: string; placeholder?: string; hint?: string; rows?: number;
}) {
  return (
    <div style={COL}>
      <span style={LBL}>{label}{required && <span style={{ color: ERR }}> *</span>}{hint && <span style={HINT}> — {hint}</span>}</span>
      <textarea placeholder={placeholder ?? ""} value={value} onChange={onChange} rows={rows} style={s_textarea(!!error)} />
      {error && <span style={ERRTXT}>{error}</span>}
    </div>
  );
}

function Select({ label, required, value, onChange, options, error, hint }: {
  label: string; required?: boolean; value: string; onChange: OCS;
  options: { value: string; label: string }[]; error?: string; hint?: string;
}) {
  return (
    <div style={COL}>
      <span style={LBL}>{label}{required && <span style={{ color: ERR }}> *</span>}{hint && <span style={HINT}> — {hint}</span>}</span>
      <select value={value} onChange={onChange} style={s_input(!!error)}>
        <option value="">Seleziona...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span style={ERRTXT}>{error}</span>}
    </div>
  );
}

function SubLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ fontSize: "0.71rem", fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: "20px 0 10px", borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>
      {label}
    </div>
  );
}

function SectionCard({ title, desc, accent, className, children }: { title: string; desc?: string; accent: string; className?: string; children: React.ReactNode }) {
  const fcrSession = loadRevampFcrEditSession();
  const integrationSession = loadRevampIntegrationEditSession();
  const automaticGroups = title.includes("Istruzione")
    ? ["istruzione"]
    : title.includes("Aree Tematiche")
      ? ["competenze", "territorio", "lingue"]
      : title.includes("Profilo Professionale")
        ? ["istruzione", "servizi_offerti", "cert_specifiche"]
        : [];
  const integrationActive = integrationSession && automaticGroups.length
    ? (
        title.includes("Aree Tematiche")
          ? integrationEditHasAnyCode(integrationSession, ["THEMATIC_SPECIFICATION"])
          : title.includes("Profilo Professionale")
            ? integrationEditHasAnyCode(integrationSession, ["THEMATIC_SPECIFICATION", "EXPERIENCE_CONSISTENCY"])
            : false
      )
    : false;
  const effectiveClassName = className ?? (integrationSession && automaticGroups.length
    ? integrationActive ? "fcr-active-group" : "fcr-locked"
    : fcrSession && automaticGroups.length
    ? automaticGroups.includes(fcrSession.sectionKey) ? "fcr-active-group" : "fcr-locked"
    : undefined);
  return (
    <div className={effectiveClassName} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "22px 26px", marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: "1rem", color: accent, marginBottom: desc ? 4 : 14 }}>{title}</div>
      {desc && <p style={{ fontSize: "0.82rem", color: MUTED, margin: "0 0 16px", lineHeight: 1.5 }}>{desc}</p>}
      {children}
    </div>
  );
}

function StepBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 40px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
        <div style={{ position: "absolute", top: 17, left: "10%", right: "10%", height: 2, background: "#e5e7eb", zIndex: 0 }} />
        <div style={{ position: "absolute", top: 17, left: "10%", width: `${(active / (STEPS.length - 1)) * 80}%`, height: 2, background: accent, zIndex: 0, transition: "width .3s" }} />
        {STEPS.map((step, i) => {
          const done = i < active; const cur = i === active;
          return (
            <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 1 }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: done || cur ? accent : "#fff", border: `2px solid ${done || cur ? accent : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.82rem", color: done || cur ? "#fff" : "#9ca3af" }}>{i + 1}</span>
              <span style={{ fontSize: "0.7rem", color: cur ? accent : done ? accent : "#9ca3af", fontWeight: cur || done ? 600 : 400, textAlign: "center" }}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, savedAt, onSave }: { title: string; subtitle: string; savedAt: string | null; onSave: () => void }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "#f5c800", borderRadius: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
        </span>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1a1a2e" }}>Solco<sup style={{ color: "#f5c800", fontSize: "0.5rem", verticalAlign: "super" }}>+</sup></span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{title}</div>
        <div style={{ fontSize: "0.73rem", color: MUTED }}>{subtitle}</div>
      </div>
      <button type="button" className={`wizard-save-button${savedAt ? " is-saved" : ""}`} onClick={onSave} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", color: "#374151" }}>
        {savedAt ? <CheckCircle size={13} /> : <Save size={13} />} {savedAt ? `Bozza salvata ${savedAt}` : "Salva bozza"}
      </button>
    </div>
  );
}

/* ─── main component ─────────────────────────────── */
export function RevampStep4DisponibilitaPage() {
  const navigate = useNavigate();
  const { registryType: registryParam, roleSlug } = useParams();
  const { auth } = useAuth();
  const isA = registryParam === "albo-a";
  const isB = registryParam === "albo-b";
  if (!isA && !isB) return <Navigate to="/apply" replace />;

  const isDocente = isA && roleSlug === "docente";
  const sectionKey = isA ? (roleSlug === "docente" ? "S4A" : `S4B_${roleSlug ?? "generic"}`) : "S3";
  const accent = isA ? NAVY : GREEN;
  const title = isA ? "Albo A — Professionisti" : "Albo B — Aziende";
  const registryType = isA ? "ALBO_A" : "ALBO_B";
  const integrationEdit = isRevampIntegrationEditFor(registryType, 3);
  const fcr = useFcrEditMode();
  const ROLE_TITLES: Record<string, string> = {
    docente: "Docente / Formatore", consulente_hr: "Consulente HR",
    cdo_lavoro: "Consulente del Lavoro", commercialista: "Commercialista",
    avvocato: "Avvocato / Consulente Legale", digital: "Consulente Digital & E-Learning",
    finanza: "Consulente Finanza Agevolata", psicologo: "Psicologo del Lavoro",
    orientatore: "Orientatore professionale", ricercatore: "Ricercatore / Valutatore",
    altro: "Altro professionista",
  };
  const roleTitle = (roleSlug ? ROLE_TITLES[roleSlug] : "") ?? "";
  const subtitle = isDocente
    ? "Sezione 4A · Scheda Docente / Formatore"
    : isA && roleTitle ? `Sezione 4B · ${roleTitle}` : "Sezione 4 · Profilo Professionale";

  /* ── step-4 sub-step sequence ───────────────────── */
  const sequence = (() => {
    const main = sessionStorage.getItem("revamp_tipologia") ?? "";
    const secRaw = sessionStorage.getItem("revamp_secondary_roles");
    const secondary: string[] = secRaw ? JSON.parse(secRaw) as string[] : [];
    return [main, ...secondary].filter(Boolean);
  })();
  const currentIdx    = roleSlug ? sequence.indexOf(roleSlug) : 0;
  const prevRoleSlug  = currentIdx > 0 ? sequence[currentIdx - 1] : null;
  const nextRoleSlug  = currentIdx >= 0 && currentIdx < sequence.length - 1 ? sequence[currentIdx + 1] : null;
  const backPath      = isA && prevRoleSlug
    ? `/apply/${registryParam}/step/4/${prevRoleSlug}`
    : `/apply/${registryParam}/step/3`;
  const forwardPath   = isA && nextRoleSlug
    ? `/apply/${registryParam}/step/4/${nextRoleSlug}`
    : `/apply/${registryParam}/step/5`;

  /* ── 3A state ──────────────────────────────────── */
  const [certAbitazioni,   setCertAbitazioni]  = useState("");
  const [certAttachment,   setCertAttachment]  = useState<AttachmentUploadResult | null>(null);
  const [certUploading,    setCertUploading]   = useState(false);
  const [uploadToast,      setUploadToast]     = useState<string | null>(null);
  const [esperienze,       setEsperienze]      = useState<Esperienza[]>([mkEsp()]);
  const [aree,             setAree]            = useState<AreasMap>(initAree);
  const [docenzaPA,        setDocenzaPA]       = useState("");
  const [consulenza,       setConsulenza]      = useState<Set<string>>(new Set());
  const [tuttaItaliaA,     setTuttaItaliaA]    = useState(false);
  const [regioniA,         setRegioniA]        = useState<Set<string>>(new Set());
  const [lingue,           setLingue]          = useState<string[]>([""]);
  const [lingueDocenza,    setLingueDocenza]   = useState("");
  const [strumenti,        setStrumenti]       = useState("");
  const [reti,             setReti]            = useState("");

  /* ── 3B state ──────────────────────────────────── */
  const [ordine,       setOrdine]       = useState("");
  const [anniEsp,      setAnniEsp]      = useState("");
  const [servizi,      setServizi]      = useState<Set<string>>(new Set());
  const [altroServ,    setAltroServ]    = useState("");
  const [certB,        setCertB]        = useState("");

  /* ── shared ────────────────────────────────────── */
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sectionWasCompleted, setSectionWasCompleted] = useState(false);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!auth?.token) return;

    function applyS3(sections: RevampSectionSnapshot[]) {
      const latest = sections
        .filter(s => s.sectionKey === sectionKey)
        .sort((a, b) => b.sectionVersion - a.sectionVersion)[0];
      if (!latest) return;
      if (latest.completed) setSectionWasCompleted(true);
      const s3 = JSON.parse(latest.payloadJson) as Record<string, unknown>;
      if (Array.isArray(s3.aree) && s3.aree.length) {
        const savedEntries = ((s3.areeEntries ?? {}) as Record<string, AreaEntry[]>);
        setAree(prev => {
          const n = { ...prev };
          (s3.aree as string[]).forEach(id => {
            if (n[id]) {
              const entries = savedEntries[id];
              n[id] = { checked: true, entries: (entries && entries.length) ? entries : [{ specifica: "", anni: "" }] };
            }
          });
          return n;
        });
      }
      if (s3.docenzaPA)         setDocenzaPA(s3.docenzaPA as string);
      if (Array.isArray(s3.consulenza)) setConsulenza(new Set(s3.consulenza as string[]));
      if (s3.tuttaItaliaA === true) { setTuttaItaliaA(true); }
      else if (Array.isArray(s3.regioniA) && (s3.regioniA as string[]).length) { setRegioniA(new Set(s3.regioniA as string[])); }
      if (Array.isArray(s3.lingue) && (s3.lingue as string[]).length) setLingue(s3.lingue as string[]);
      else if (s3.lingue && typeof s3.lingue === "string") setLingue([s3.lingue as string]);
      if (s3.lingueDocenza)     setLingueDocenza(s3.lingueDocenza as string);
      if (s3.strumenti)         setStrumenti(s3.strumenti as string);
      if (s3.reti)              setReti(s3.reti as string);
      if (s3.ordine)            setOrdine(s3.ordine as string);
      if (s3.anniEsp)           setAnniEsp(s3.anniEsp as string);
      if (Array.isArray(s3.servizi)) setServizi(new Set(s3.servizi as string[]));
      if (s3.altroServ)         setAltroServ(s3.altroServ as string);
      if (s3.certB)             setCertB(s3.certB as string);
      if (Array.isArray(s3.esperienze) && (s3.esperienze as unknown[]).length) setEsperienze(s3.esperienze as Esperienza[]);
      if (s3.certAbitazioni)    setCertAbitazioni(s3.certAbitazioni as string);
      if (Array.isArray(s3.attachments)) {
        for (const att of s3.attachments as Array<Record<string, unknown>>) {
          if (att.documentType === "CERTIFICATION") {
            setCertAttachment({ fileName: att.fileName as string, storageKey: att.storageKey as string, mimeType: att.mimeType as string, sizeBytes: att.sizeBytes as number });
          }
        }
      }
    }

    const existingAppId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
    if (existingAppId) {
      getRevampApplicationSections(existingAppId, auth.token).then(applyS3).catch(() => {});
      return;
    }

    getMyLatestRevampApplication(auth.token).then(app => {
      if (!app || app.status !== "DRAFT" || app.registryType !== registryType) return;
      saveRevampApplicationIdForRegistry(registryType, app.id);
      return getRevampApplicationSections(app.id, auth!.token!).then(applyS3);
    }).catch(() => {});
  }, [auth?.token, registryType, sectionKey]);

  useEffect(() => {
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    const timer = setTimeout(() => { void handleSaveDraft(); }, 2000);
    return () => clearTimeout(timer);
  }, [aree, docenzaPA, consulenza, tuttaItaliaA, regioniA, lingue, lingueDocenza, strumenti, reti, ordine, anniEsp, servizi, altroServ, certB, certAbitazioni, certAttachment, esperienze]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearErr(key: string) {
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
  }

  function handleSave() {
    const now = new Date();
    setSavedAt(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  }

  async function handleSaveDraft() {
    if (!auth?.token) return;
    try {
      const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
      if (!appId) return;
      const areeChecked = AREE_TEMATICHE.filter(a => aree[a.id].checked).map(a => a.id);
      const areeEntries = Object.fromEntries(areeChecked.map(id => [id, aree[id].entries]));
      const draftPayload = JSON.stringify({
        aree: areeChecked, areeEntries, tuttaItaliaA, regioniA: Array.from(regioniA), lingue, lingueDocenza, strumenti, reti,
        docenzaPA, consulenza: Array.from(consulenza),
        anniEsp, ordine, certB,
        servizi: Array.from(servizi), altroServ,
        esperienze,
        certAbitazioni,
        attachments: [...(certAttachment ? [{ documentType: "CERTIFICATION", fileName: certAttachment.fileName, storageKey: certAttachment.storageKey, mimeType: certAttachment.mimeType, sizeBytes: certAttachment.sizeBytes }] : [])],
      });
      await saveRevampApplicationSection(appId, sectionKey, draftPayload, sectionWasCompleted, auth.token);
      handleSave();
    } catch { /* best-effort */ }
  }

  function toggleArea(id: string) {
    setAree(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
    clearErr("aree");
  }
  function setEntryField(id: string, idx: number, f: "specifica" | "anni", v: string) {
    setAree(prev => {
      const entries = prev[id].entries.map((e, i) => i === idx ? { ...e, [f]: v } : e);
      return { ...prev, [id]: { ...prev[id], entries } };
    });
    clearErr(`specifica_${id}_${idx}`);
    clearErr(`anni_${id}_${idx}`);
  }
  function addEntry(id: string) {
    setAree(prev => ({ ...prev, [id]: { ...prev[id], entries: [...prev[id].entries, { specifica: "", anni: "" }] } }));
  }
  function removeEntry(id: string, idx: number) {
    setAree(prev => {
      const entries = prev[id].entries.filter((_, i) => i !== idx);
      return { ...prev, [id]: { ...prev[id], entries: entries.length ? entries : [{ specifica: "", anni: "" }] } };
    });
  }
  function showToast(msg: string) {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(null), 3000);
  }

  async function handleFileUpload(file: File) {
    if (!auth?.token) return;
    setCertUploading(true);
    try {
      let appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
      if (!appId) {
        const draft = await createRevampApplicationDraft({ registryType: registryType as "ALBO_A" | "ALBO_B", sourceChannel: "PUBLIC" }, auth.token);
        saveRevampApplicationIdForRegistry(registryType, draft.id);
        appId = draft.id;
      }
      const result = await uploadRevampAttachment(appId, file, auth.token);
      setCertAttachment(result);
      showToast("File caricato con successo.");
    } catch {
      showToast("Errore durante il caricamento. Riprova.");
    } finally {
      setCertUploading(false);
    }
  }

  function updateEsp(idx: number, field: keyof Esperienza, val: string) {
    setEsperienze(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
    clearErr(`esp_${idx}_${field}`);
  }
  function addEsp() { if (esperienze.length < 5) setEsperienze(prev => [...prev, mkEsp()]); }
  function removeEsp(idx: number) { setEsperienze(prev => prev.filter((_, i) => i !== idx)); }

  function toggleConsulenza(v: string) {
    setConsulenza(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }
  function toggleServizio(v: string) {
    setServizi(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
    clearErr("servizi");
  }

  async function saveSectionProgrammatic() {
    if (!auth?.token) throw new Error("Sessione scaduta. Effettua nuovamente il login.");
    const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
    if (!appId) throw new Error("Candidatura non trovata.");
    const areeChecked = AREE_TEMATICHE.filter(a => aree[a.id].checked).map(a => a.id);
    const areeEntries = Object.fromEntries(areeChecked.map(id => [id, aree[id].entries]));
    const frontendPayload = {
      aree: areeChecked, areeEntries,
      tuttaItaliaA, regioniA: Array.from(regioniA), lingue, lingueDocenza, strumenti, reti,
      docenzaPA, consulenza: Array.from(consulenza),
      anniEsp, ordine, certB,
      servizi: Array.from(servizi), altroServ,
      esperienze,
      certAbitazioni,
      attachments: [...(certAttachment ? [{ documentType: "CERTIFICATION", fileName: certAttachment.fileName, storageKey: certAttachment.storageKey, mimeType: certAttachment.mimeType, sizeBytes: certAttachment.sizeBytes }] : [])],
    };
    const presentationStr = tuttaItaliaA ? "Tutta Italia" : Array.from(regioniA).join(", ");
    if (isDocente) {
      await saveRevampApplicationSection(appId, sectionKey, JSON.stringify({
        ...frontendPayload,
        thematicAreasCsv: areeChecked.join(","),
        presentation: presentationStr,
      }), true, auth.token);
    } else {
      const payload = isA ? {
        ...frontendPayload,
        professionalOrder: ordine,
        experienceBand: anniEsp,
        services: Array.from(servizi),
        hourlyRateRange: "",
        territory: { regionsCsv: "", provincesCsv: "" },
      } : frontendPayload;
      await saveRevampApplicationSection(appId, sectionKey, JSON.stringify(payload), true, auth.token);
    }
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (integrationEdit) return e;
    if (isDocente) {
      const nChecked = AREE_TEMATICHE.filter(a => aree[a.id].checked).length;
      if (nChecked === 0) e.aree = "Seleziona almeno un ambito tematico.";
      for (const area of AREE_TEMATICHE) {
        const st = aree[area.id];
        if (st.checked) {
          st.entries.forEach((entry, idx) => {
            if (!entry.specifica.trim()) e[`specifica_${area.id}_${idx}`] = "Obbligatorio.";
            if (!entry.anni)             e[`anni_${area.id}_${idx}`]      = "Obbligatorio.";
          });
        }
      }
      if (!docenzaPA) e.docenzaPA = "Campo obbligatorio.";
      if (!tuttaItaliaA && regioniA.size === 0) e.regioniA = "Seleziona almeno una regione di operatività.";
      for (let i = 0; i < esperienze.length; i++) {
        const esp = esperienze[i];
        if (!esp.committente.trim()) e[`esp_${i}_committente`]    = "Obbligatorio.";
        if (!esp.ambitoTematico)     e[`esp_${i}_ambitoTematico`] = "Obbligatorio.";
        if (!esp.periodoFrom.trim()) e[`esp_${i}_periodoFrom`]    = "Obbligatorio.";
        else if (!isValidMonthYear(esp.periodoFrom)) e[`esp_${i}_periodoFrom`] = "Formato non valido (MM/AAAA).";
        if (!esp.periodoTo.trim())   e[`esp_${i}_periodoTo`]      = "Obbligatorio.";
        else if (!isValidMonthYear(esp.periodoTo))   e[`esp_${i}_periodoTo`]   = "Formato non valido (MM/AAAA).";
        else if (isToBeforeFrom(esp.periodoFrom, esp.periodoTo)) e[`esp_${i}_periodoTo`] = "La data di fine non può essere precedente a quella di inizio.";
        if (!esp.durata.trim())      e[`esp_${i}_durata`]         = "Obbligatorio.";
        if (!esp.modalita)           e[`esp_${i}_modalita`]       = "Obbligatorio.";
      }
    } else {
      if (!anniEsp)          e.anniEsp   = "Campo obbligatorio.";
      if (servizi.size === 0 && !altroServ.trim()) e.servizi = "Indica almeno un servizio offerto.";
    }
    return e;
  }

  async function handleNext() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    handleSave();
    const areeChecked = AREE_TEMATICHE.filter(a => aree[a.id].checked).map(a => a.id);
    const areeEntries = Object.fromEntries(areeChecked.map(id => [id, aree[id].entries]));
    const frontendPayload = {
      aree: areeChecked, areeEntries,
      tuttaItaliaA, regioniA: Array.from(regioniA), lingue, lingueDocenza, strumenti, reti,
      docenzaPA, consulenza: Array.from(consulenza),
      anniEsp, ordine, certB,
      servizi: Array.from(servizi), altroServ,
      esperienze,
      certAbitazioni,
      attachments: [...(certAttachment ? [{ documentType: "CERTIFICATION", fileName: certAttachment.fileName, storageKey: certAttachment.storageKey, mimeType: certAttachment.mimeType, sizeBytes: certAttachment.sizeBytes }] : [])],
    };
    const presentationStr = tuttaItaliaA ? "Tutta Italia" : Array.from(regioniA).join(", ");
    sessionStorage.setItem("revamp_s3", JSON.stringify(frontendPayload));
    let savedAppId: string | null = null;
    if (auth?.token) {
      try {
        const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
        if (appId) {
          savedAppId = appId;
          if (isDocente) {
            await saveRevampApplicationSection(appId, sectionKey, JSON.stringify({
              ...frontendPayload,
              thematicAreasCsv: areeChecked.join(","),
              presentation: presentationStr,
            }), true, auth.token);
          } else {
            const savePayload = isA ? {
              ...frontendPayload,
              professionalOrder: ordine,
              experienceBand: anniEsp,
              services: Array.from(servizi),
              hourlyRateRange: "",
              territory: { regionsCsv: "", provincesCsv: "" },
            } : frontendPayload;
            await saveRevampApplicationSection(appId, sectionKey, JSON.stringify(savePayload), true, auth.token);
          }
        }
      } catch {
        window.alert("Salvataggio non riuscito. Controlla i dati e riprova.");
        return;
      }
    }
    if (integrationEdit && auth?.token && savedAppId) {
      try {
        await completeRevampIntegrationEdit(savedAppId, auth.token, integrationEdit);
        clearRevampIntegrationEditSession();
      } catch {
        window.alert("Invio integrazione non riuscito. Controlla i dati e riprova.");
        return;
      }
    }
    navigate(integrationEdit?.returnPath ?? forwardPath);
  }

  const checkedAree  = AREE_TEMATICHE.filter(a => aree[a.id].checked).length;
  const serviziList  = isA && roleSlug ? (SERVIZI_MAP[roleSlug] ?? []) : [];

  return (
    <div style={{ margin: "-1rem", background: "#f0f4f8", minHeight: "100%" }}>
      <PageHeader title={title} subtitle={subtitle} savedAt={savedAt} onSave={() => void handleSaveDraft()} />
      {integrationEdit || fcr.active ? (
        <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "12px 40px", color: "#174f82", fontSize: "0.86rem", fontWeight: 700 }}>
          {fcr.active ? "Richiesta di modifica - Aggiorna solo il gruppo sbloccato, poi salva e invia." : "Integrazione richiesta - Correggi la sezione Competenze, salva e invia la risposta."}
        </div>
      ) : (
        <StepBar active={3} accent={accent} />
      )}

      {uploadToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1f2937", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: "0.83rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {uploadToast}
        </div>
      )}

      <div style={{ maxWidth: 980, margin: "20px auto", padding: "0 20px 100px" }}>

        {/* ── Role title banner (Albo A only) ── */}
        {isA && roleTitle && (
          <div style={{ background: "#fff", borderRadius: 10, border: `2px solid ${accent}20`, padding: "18px 26px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 4, height: 40, borderRadius: 2, background: accent, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: accent, lineHeight: 1.2 }}>{roleTitle}</div>
              <div style={{ fontSize: "0.78rem", color: MUTED, marginTop: 3 }}>
                Compila le informazioni relative a questo profilo professionale
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SEZIONE 4A — SCHEDA DOCENTE / FORMATORE
        ══════════════════════════════════════════ */}
        {isDocente && (
          <>
            {/* ── A — Certificazioni ── */}
            <SectionCard title="A — Certificazioni e Abilitazioni" accent={accent}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Textarea
                  label="Certificazioni e abilitazioni"
                  hint="opzionale"
                  value={certAbitazioni}
                  onChange={e => setCertAbitazioni(e.target.value)}
                  rows={3}
                  placeholder="Es. Abilitazione all'insegnamento, certificazione PNL, coach ICF..."
                />
                <FileUpload
                  label="Certificazioni e attestati"
                  hint="opzionale — PDF max 5 MB"
                  uploading={certUploading}
                  result={certAttachment}
                  onSelect={handleFileUpload}
                />
              </div>
            </SectionCard>

            {/* ── D — Esperienze formative ── */}
            <SectionCard title="D — Esperienze formative" accent={accent}
              desc="Inserisci le principali esperienze di docenza e formazione degli ultimi 5 anni. Inizia con la più recente.">
              {esperienze.map((esp, idx) => (
                <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "18px 20px", marginBottom: 14, background: "#fafafa", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: accent }}>Esperienza {idx + 1}</div>
                    {esperienze.length > 1 && (
                      <button type="button" onClick={() => removeEsp(idx)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid #fca5a5", background: "#fff5f5", borderRadius: 5, fontSize: "0.75rem", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}>
                        <Trash2 size={12} /> Rimuovi
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Field label="Committente / Organizzazione" required value={esp.committente}
                      onChange={e => updateEsp(idx, "committente", e.target.value)}
                      placeholder="Es. Regione Lombardia, FIAT S.p.A."
                      error={errors[`esp_${idx}_committente`]} />
                    <Select label="Settore del committente" hint="opzionale" value={esp.settore}
                      onChange={e => updateEsp(idx, "settore", e.target.value)}
                      options={SETTORI_COMMITTENTE} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Field label="Titolo / descrizione del corso o intervento" hint="opzionale" value={esp.tipoIntTesto}
                      onChange={e => updateEsp(idx, "tipoIntTesto", e.target.value)}
                      placeholder="Es. Corso Excel avanzato per HR" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Select label="Ambito tematico principale" required value={esp.ambitoTematico}
                      onChange={e => updateEsp(idx, "ambitoTematico", e.target.value)}
                      options={AREE_TEMATICHE.map(a => ({ value: a.id, label: a.label }))}
                      error={errors[`esp_${idx}_ambitoTematico`]} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Field label="Periodo — da (MM/AAAA)" required value={esp.periodoFrom}
                      onChange={e => updateEsp(idx, "periodoFrom", fmtMonthYear(e.target.value))}
                      onBlur={() => {
                        const v = esp.periodoFrom;
                        if (v.trim() && !isValidMonthYear(v)) setErrors(prev => ({ ...prev, [`esp_${idx}_periodoFrom`]: "Formato non valido (MM/AAAA)." }));
                        else if (v.trim()) setErrors(prev => { const n = { ...prev }; delete n[`esp_${idx}_periodoFrom`]; return n; });
                      }}
                      placeholder="01/2023" error={errors[`esp_${idx}_periodoFrom`]} />
                    <Field label="Periodo — a (MM/AAAA)" required value={esp.periodoTo}
                      onChange={e => updateEsp(idx, "periodoTo", fmtMonthYear(e.target.value))}
                      onBlur={() => {
                        const v = esp.periodoTo;
                        if (v.trim() && !isValidMonthYear(v)) setErrors(prev => ({ ...prev, [`esp_${idx}_periodoTo`]: "Formato non valido (MM/AAAA)." }));
                        else if (v.trim() && isToBeforeFrom(esp.periodoFrom, v)) setErrors(prev => ({ ...prev, [`esp_${idx}_periodoTo`]: "La data di fine non può essere precedente a quella di inizio." }));
                        else if (v.trim()) setErrors(prev => { const n = { ...prev }; delete n[`esp_${idx}_periodoTo`]; return n; });
                      }}
                      placeholder="06/2023" error={errors[`esp_${idx}_periodoTo`]} />
                    <Field label="Durata totale in ore" required value={esp.durata}
                      onChange={e => updateEsp(idx, "durata", e.target.value)}
                      placeholder="Es. 24" error={errors[`esp_${idx}_durata`]} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Select label="Modalità di erogazione" required value={esp.modalita}
                      onChange={e => updateEsp(idx, "modalita", e.target.value)}
                      options={MODALITA_EROGAZIONE}
                      error={errors[`esp_${idx}_modalita`]} />
                    <Select label="Finanziata (FSE, fondi, ecc.)" hint="opzionale" value={esp.finanziata}
                      onChange={e => updateEsp(idx, "finanziata", e.target.value)}
                      options={[{ value: "si", label: "Sì" }, { value: "no", label: "No" }]} />
                    {esp.finanziata === "si" && (
                      <Field label="Fondo o programma" hint="opz." value={esp.fondoProgramma}
                        onChange={e => updateEsp(idx, "fondoProgramma", e.target.value)}
                        placeholder="Es. FSE+ 2021–27, FON.TER"
                        error={errors[`esp_${idx}_fondoProgramma`]} />
                    )}
                  </div>
                </div>
              ))}
              {esperienze.length < 5 && (
                <button type="button" onClick={addEsp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", border: `1.5px dashed ${accent}`, borderRadius: 6, color: accent, fontSize: "0.83rem", fontWeight: 600, cursor: "pointer" }}>
                  <Plus size={14} /> Aggiungi un'altra esperienza ({esperienze.length}/5)
                </button>
              )}
            </SectionCard>

            {/* ── B — Aree Tematiche ── */}
            <SectionCard title="B — Aree Tematiche di Competenza" accent={accent}
              desc="Seleziona tutti gli ambiti in cui sei in grado di erogare docenza o formazione. Per ogni ambito selezionato specifica i sottotemi trattati e la tua fascia di esperienza.">

              {errors.aree ? (
                <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "9px 12px", marginBottom: 12, fontSize: "0.82rem", color: "#b91c1c" }}>⚠ {errors.aree}</div>
              ) : checkedAree > 0 ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: "0.78rem", color: "#16a34a" }}>
                  ✓ {checkedAree} {checkedAree === 1 ? "ambito selezionato" : "ambiti selezionati"}
                </div>
              ) : (
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: "0.78rem", color: "#1d4ed8" }}>
                  ℹ Seleziona almeno un ambito. Per ogni voce selezionata compila i campi obbligatori.
                </div>
              )}

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                {AREE_TEMATICHE.map((area, idx) => {
                  const st = aree[area.id];
                  const hasFieldErr = st.entries.some((_, i) => !!(errors[`specifica_${area.id}_${i}`] || errors[`anni_${area.id}_${i}`]));
                  return (
                    <div key={area.id} style={{ borderBottom: idx < AREE_TEMATICHE.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div onClick={() => toggleArea(area.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: st.checked ? `${accent}05` : (hasFieldErr ? "#fff5f5" : "transparent") }}>
                        <span style={{ width: 18, height: 18, border: `2px solid ${st.checked ? accent : "#d1d5db"}`, borderRadius: 3, background: st.checked ? accent : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {st.checked && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                        </span>
                        <span style={{ fontSize: "0.85rem", fontWeight: st.checked ? 600 : 400, color: st.checked ? accent : "#374151", flex: 1 }}>{area.label}</span>
                        {hasFieldErr && <span style={{ fontSize: "0.7rem", color: ERR }}>● compila i campi</span>}
                      </div>
                      {st.checked && (
                        <div style={{ padding: "0 14px 14px 42px" }}>
                          {st.entries.map((entry, eIdx) => (
                            <div key={eIdx} style={{ display: "grid", gridTemplateColumns: "1fr 170px 32px", gap: 10, marginBottom: eIdx < st.entries.length - 1 ? 10 : 0 }}>
                              <div style={COL}>
                                {eIdx === 0 && <span style={LBL}>Specifica tematiche <span style={{ color: ERR }}>*</span></span>}
                                <input type="text" value={entry.specifica}
                                  onChange={e => setEntryField(area.id, eIdx, "specifica", e.target.value)}
                                  placeholder="Indica i sottotemi specifici trattati..."
                                  style={s_input(!!errors[`specifica_${area.id}_${eIdx}`])} />
                                {errors[`specifica_${area.id}_${eIdx}`] && <span style={ERRTXT}>{errors[`specifica_${area.id}_${eIdx}`]}</span>}
                              </div>
                              <div style={COL}>
                                {eIdx === 0 && <span style={LBL}>Anni di esperienza <span style={{ color: ERR }}>*</span></span>}
                                <select value={entry.anni} onChange={e => setEntryField(area.id, eIdx, "anni", e.target.value)} style={s_input(!!errors[`anni_${area.id}_${eIdx}`])}>
                                  <option value="">Seleziona...</option>
                                  {ANNI_DOC.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                {errors[`anni_${area.id}_${eIdx}`] && <span style={ERRTXT}>{errors[`anni_${area.id}_${eIdx}`]}</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                {eIdx > 0 ? (
                                  <button type="button" onClick={() => removeEntry(area.id, eIdx)}
                                    style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff", color: ERR, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    ×
                                  </button>
                                ) : <span style={{ width: 28 }} />}
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addEntry(area.id)}
                            style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", color: accent, background: "none", border: `1.5px solid ${accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                            + Aggiungi tematica
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <SubLabel label="Docenza per la Pubblica Amministrazione" accent={accent} />
              <div style={{ maxWidth: 400 }}>
                <Select label="Hai esperienza di docenza per la PA?" required value={docenzaPA}
                  onChange={e => { setDocenzaPA(e.target.value); clearErr("docenzaPA"); }}
                  options={[
                    { value: "si_centrale",  label: "Sì — PA centrale (Ministeri, Agenzie)" },
                    { value: "si_locale",    label: "Sì — PA locale (Comuni, Regioni, ASL, ecc.)" },
                    { value: "si_entrambe",  label: "Sì — entrambe" },
                    { value: "no",           label: "No" },
                  ]}
                  error={errors.docenzaPA} />
              </div>

              <SubLabel label="Ambiti di consulenza offerti" accent={accent} />
              <p style={{ fontSize: "0.81rem", color: MUTED, margin: "0 0 10px", lineHeight: 1.5 }}>
                Oltre alla docenza, indica le tematiche su cui offri anche servizi di consulenza. <em>Opzionale.</em>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 6 }}>
                {AMBITI_CONSULENZA.map(amb => (
                  <label key={amb} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.81rem", color: consulenza.has(amb) ? accent : "#374151", fontWeight: consulenza.has(amb) ? 600 : 400 }}>
                    <input type="checkbox" checked={consulenza.has(amb)} onChange={() => toggleConsulenza(amb)} style={{ accentColor: accent }} />
                    {amb}
                  </label>
                ))}
              </div>

              <SubLabel label="Area territoriale di attività in presenza" accent={accent} />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer", padding: "7px 16px", borderRadius: 6, background: tuttaItaliaA ? accent : "#eff6ff", border: `1.5px solid ${tuttaItaliaA ? accent : "#93c5fd"}`, fontWeight: 700, fontSize: "0.84rem", color: tuttaItaliaA ? "#fff" : accent, transition: "background .15s, color .15s", userSelect: "none" }}>
                <input type="checkbox" checked={tuttaItaliaA} onChange={() => { setTuttaItaliaA(v => !v); if (!tuttaItaliaA) setRegioniA(new Set()); clearErr("regioniA"); }} style={{ accentColor: "#fff", width: 15, height: 15 }} />
                Tutta Italia
              </label>
              {!tuttaItaliaA && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
                    {REGIONI_IT.map(r => (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer", padding: "6px 8px", borderRadius: 6, background: regioniA.has(r) ? `${accent}0d` : "#f9fafb", border: `1px solid ${regioniA.has(r) ? accent : "#e5e7eb"}`, transition: "background .12s" }}>
                        <input type="checkbox" checked={regioniA.has(r)} onChange={() => { setRegioniA(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; }); clearErr("regioniA"); }} style={{ accentColor: accent }} /> {r}
                      </label>
                    ))}
                  </div>
                  {regioniA.size > 0 && <div style={{ fontSize: "0.78rem", color: "#16a34a", marginBottom: 4 }}>✓ {regioniA.size} {regioniA.size === 1 ? "regione selezionata" : "regioni selezionate"}</div>}
                </>
              )}
              {errors.regioniA && <div style={{ fontSize: "0.74rem", color: ERR, marginBottom: 12 }}>{errors.regioniA}</div>}

              <SubLabel label="Lingue, strumenti digitali e reti professionali" accent={accent} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={COL}>
                  <span style={LBL}>Lingue parlate (oltre all'italiano) e livello QCER <span style={{ color: MUTED, fontWeight: 400 }}>(opz.)</span></span>
                  {lingue.map((val, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < lingue.length - 1 ? 6 : 0 }}>
                      <input type="text" value={val}
                        onChange={e => setLingue(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        placeholder="Es. Inglese B2"
                        style={s_input()} />
                      {i > 0 && (
                        <button type="button" onClick={() => setLingue(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff", color: ERR, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setLingue(prev => [...prev, ""])}
                    style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", color: accent, background: "none", border: `1.5px solid ${accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600, alignSelf: "flex-start" }}>
                    + Aggiungi lingua
                  </button>
                </div>
                <div style={COL}>
                  <span style={LBL}>Lingue straniere in cui può erogare docenza <span style={{ color: MUTED, fontWeight: 400 }}>(opz.)</span></span>
                  <input type="text" value={lingueDocenza} onChange={e => setLingueDocenza(e.target.value)} maxLength={200} placeholder="Es. Inglese, Francese..." style={s_input()} />
                </div>
                <div style={COL}>
                  <span style={LBL}>Strumenti digitali rilevanti <span style={{ color: MUTED, fontWeight: 400 }}>(opz.)</span></span>
                  <input type="text" value={strumenti} onChange={e => setStrumenti(e.target.value)} maxLength={200} placeholder="Es. Mural, Mentimeter, MS Teams, Zoom, Power BI, Canva..." style={s_input()} />
                </div>
                <div style={COL}>
                  <span style={LBL}>Partecipazione a reti professionali o associazioni <span style={{ color: MUTED, fontWeight: 400 }}>(opz.)</span></span>
                  <input type="text" value={reti} onChange={e => setReti(e.target.value)} maxLength={200} placeholder="Es. AIF, AIDP, AIFOS, Federmanager..." style={s_input()} />
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ══════════════════════════════════════════
            SEZIONE 4B — ALTRI PROFESSIONISTI
        ══════════════════════════════════════════ */}
        {!isDocente && (
          <SectionCard title="Profilo Professionale" accent={accent}
            desc="Compila i dati relativi alle tue qualifiche, ai servizi che offri al Gruppo Solco e alle certificazioni rilevanti.">

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Select label="Anni di esperienza professionale complessiva" required value={anniEsp}
                onChange={e => { setAnniEsp(e.target.value); clearErr("anniEsp"); }}
                options={ANNI_PROF} error={errors.anniEsp} />
              <Field label="Ordine professionale di appartenenza" tooltip="se iscritto"
                value={ordine} onChange={e => setOrdine(e.target.value)}
                placeholder="Es. CPO, CNF, ODCEC, Ordine Psicologi..." />
            </div>

            <SubLabel label="Servizi offerti al Gruppo Solco" accent={accent} />
            {errors.servizi && (
              <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "9px 12px", marginBottom: 10, fontSize: "0.81rem", color: "#b91c1c" }}>
                ⚠ {errors.servizi}
              </div>
            )}
            {serviziList.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7, marginBottom: 12 }}>
                {serviziList.map(s => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.82rem", color: servizi.has(s) ? accent : "#374151", fontWeight: servizi.has(s) ? 600 : 400 }}>
                    <input type="checkbox" checked={servizi.has(s)} onChange={() => toggleServizio(s)} style={{ accentColor: accent }} />
                    {s}
                  </label>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <Textarea
                label={serviziList.length > 0 ? "Altro / campo libero" : "Descrivi i servizi offerti"}
                required={serviziList.length === 0}
                value={altroServ} onChange={e => { setAltroServ(e.target.value); clearErr("servizi"); }}
                placeholder="Descrivi i servizi che offri al Gruppo Solco..."
                error={serviziList.length === 0 ? errors.servizi : undefined} rows={2} />
            </div>

            <SubLabel label="Certificazioni e abilitazioni specifiche" accent={accent} />
            <Textarea label="Abilitazioni, specializzazioni post-laurea, master rilevanti" hint="opzionale"
              value={certB} onChange={e => setCertB(e.target.value)}
              placeholder="Es. abilitazione professionale, certificazione internazionale, master rilevante..." rows={2} />
          </SectionCard>
        )}

      </div>

      {!fcr.active && (
        <div className="wizard-bottom-nav" style={{ background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 36px", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
          <Link className="wizard-nav-button wizard-nav-button-prev" to={integrationEdit?.returnPath ?? backPath} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 6, fontWeight: 600, fontSize: "0.84rem", color: accent, textDecoration: "none" }}>
            <ArrowLeft size={14} /> {integrationEdit ? "Torna alla richiesta" : "Sezione precedente"}
          </Link>
          {integrationEdit ? (
            <div style={{ fontSize: "0.77rem", color: MUTED, fontWeight: 700 }}>Modalita integrazione</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: "0.77rem", color: MUTED }}>
                Avanzamento: <strong>80%</strong>
                {isA && sequence.length > 1 && (
                  <span style={{ marginLeft: 8, color: accent, fontWeight: 600 }}>
                    ({currentIdx + 1}/{sequence.length})
                  </span>
                )}
              </span>
              <div style={{ width: 180, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "80%", height: "100%", background: accent, borderRadius: 2 }} />
              </div>
            </div>
          )}
          <button className="wizard-nav-button wizard-nav-button-next" type="button" onClick={handleNext} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: accent, color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: "0.84rem", cursor: "pointer" }}>
            {integrationEdit ? "Salva e invia integrazione" : "Sezione successiva"} <ArrowRight size={14} />
          </button>
        </div>
      )}
      {auth && <FcrSubmitBar fcr={fcr} token={auth.token!} onSectionSaved={saveSectionProgrammatic} />}
    </div>
  );
}
