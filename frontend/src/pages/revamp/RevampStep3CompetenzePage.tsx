import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, Save } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { getMyLatestRevampApplication, getRevampApplicationSections, saveRevampApplicationSection } from "../../api/revampApplicationApi";
import { loadRevampApplicationIdForRegistry, saveRevampApplicationIdForRegistry } from "../../utils/revampApplicationSession";
import { clearRevampIntegrationEditSession, isRevampIntegrationEditFor } from "../../utils/revampIntegrationEditSession";
import { completeRevampIntegrationEdit } from "../../utils/revampIntegrationCompletion";
import { loadRevampFcrEditSession } from "../../utils/revampFcrEditSession";
import { useFcrEditMode } from "../../hooks/useFcrEditMode";
import { FcrSubmitBar } from "../../components/supplier/FcrSubmitBar";

const NAVY  = "#0f2a52";
const GREEN = "#1a5c3a";
const MUTED = "#6b7280";
const ERR   = "#dc2626";
const INFO_BG     = "#eff6ff";
const INFO_BORDER = "#93c5fd";
const INFO_TEXT   = "#1d4ed8";

const STEPS = ["Anagrafica", "Tipologia", "Competenze", "Disponibilità", "Dichiarazioni"];

/* ─── card definitions ─────────────────────────── */
type CardDef = { id: string; title: string; tag: string; desc: string; badge?: string };

const CARDS_A: CardDef[] = [
  { id: "docente",        title: "Docente / Formatore",                       tag: "Formazione e didattica",        desc: "Sezione dedicata con aree tematiche, metodologie e strumenti didattici", badge: "Percorso approfondito" },
  { id: "consulente_hr",  title: "Consulente HR / Sviluppo Organizzativo",    tag: "Organizzazione e persone",      desc: "Consulenza su risorse umane, recruiting, welfare, sviluppo organizzativo" },
  { id: "cdo_lavoro",     title: "Consulente del Lavoro",                     tag: "Professionista iscritto CPO",   desc: "Payroll, contrattualistica, contenzioso, rapporti di lavoro" },
  { id: "commercialista", title: "Commercialista / Dottore Commercialista",   tag: "Professionista iscritto ODCEC", desc: "Contabilità, bilancio, fiscalità d'impresa, finanza agevolata" },
  { id: "avvocato",       title: "Avvocato / Consulente Legale",              tag: "Professionista iscritto CNF",   desc: "Diritto del lavoro, GDPR, contrattualistica, terzo settore" },
  { id: "digital",        title: "Consulente Digital & E-Learning",           tag: "Tecnologie per la formazione",  desc: "LMS, contenuti digitali, UX/UI, strumenti di authoring" },
  { id: "finanza",        title: "Consulente Finanza Agevolata e Bandi",      tag: "Bandi e contributi pubblici",   desc: "Fondi EU, crediti d'imposta, progettazione e rendicontazione" },
  { id: "psicologo",      title: "Psicologo del Lavoro / Career Coach",       tag: "Sviluppo persone",              desc: "Assessment, outplacement, coaching individuale e di gruppo" },
  { id: "orientatore",    title: "Orientatore professionale",                 tag: "Servizi al lavoro",             desc: "Bilancio competenze, counseling di carriera, accompagnamento" },
  { id: "ricercatore",    title: "Ricercatore / Valutatore",                  tag: "Ricerca e valutazione",         desc: "Ricerca applicata, valutazione di progetti, monitoraggio e impact" },
  { id: "altro",          title: "Altro professionista (specificare)",        tag: "Specifica il tuo ambito",       desc: "Inserisci il codice ATECO per personalizzare il questionario" },
];

const TIPO_TO_PROFESSIONAL: Record<string, string> = {
  docente: "DOCENTE_FORMATORE",
  ricercatore: "DOCENTE_FORMATORE",
  psicologo: "PSICOLOGO_COACH",
  coach: "PSICOLOGO_COACH",
  mediatore: "PSICOLOGO_COACH",
  consulente_hr: "CONSULENTE",
  cdo_lavoro: "CONSULENTE",
  commercialista: "CONSULENTE",
  avvocato: "CONSULENTE",
  digital: "CONSULENTE",
  finanza: "CONSULENTE",
  orientatore: "CONSULENTE",
  altro: "ALTRO",
};

function professionalTypeForTipologia(tipologia: string | null): string {
  return tipologia ? (TIPO_TO_PROFESSIONAL[tipologia] ?? "CONSULENTE") : "";
}

function professionalTypesForTipologie(tipologie: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(tipologie).map(professionalTypeForTipologia).filter(Boolean)));
}

function infoMessage(cardId: string): string {
  const map: Record<string, string> = {
    docente:        "Hai selezionato 'Docente / Formatore': il questionario includerà la Sezione 4A con aree tematiche dettagliate, metodologie, disponibilità, esperienze formative e allegati.",
    consulente_hr:  "Hai selezionato 'Consulente HR / Sviluppo Organizzativo': il questionario includerà sezioni su competenze HR, strumenti utilizzati e principali settori serviti.",
    cdo_lavoro:     "Hai selezionato 'Consulente del Lavoro': il questionario includerà sezioni su iscrizione all'ordine, specializzazioni e portfolio clienti.",
    commercialista: "Hai selezionato 'Commercialista / Dottore Commercialista': il questionario includerà sezioni su iscrizione ODCEC, specializzazioni fiscali e struttura dello studio.",
    avvocato:       "Hai selezionato 'Avvocato / Consulente Legale': il questionario includerà sezioni su iscrizione CNF, aree di pratica e referenze.",
    digital:        "Hai selezionato 'Consulente Digital & E-Learning': il questionario includerà sezioni su tecnologie usate, portfolio prodotti e certificazioni.",
    finanza:        "Hai selezionato 'Consulente Finanza Agevolata e Bandi': il questionario includerà sezioni su tipologie di bandi gestiti, volumi e referenze.",
    psicologo:      "Hai selezionato 'Psicologo del Lavoro / Career Coach': il questionario includerà sezioni su iscrizione all'ordine, certificazioni di coaching e metodologie.",
    orientatore:    "Hai selezionato 'Orientatore professionale': il questionario includerà sezioni su accreditamento, servizi erogati e bacino territoriale.",
    ricercatore:    "Hai selezionato 'Ricercatore / Valutatore': il questionario includerà sezioni su aree di ricerca, metodologie e pubblicazioni o report prodotti.",
    altro:          "Hai selezionato 'Altro professionista': inserisci il codice ATECO per personalizzare il questionario.",
  };
  return map[cardId] ?? "";
}

/* ─── ui primitives ─────────────────────────────── */
function TypeCard({ card, selected, onClick, accent, disabled = false }: { card: CardDef; selected: boolean; onClick: () => void; accent: string; disabled?: boolean }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{ background: selected ? `${accent}08` : "#fff", border: `1.5px solid ${selected ? accent : "#e5e7eb"}`, borderRadius: 8, padding: "14px 12px", cursor: disabled ? "default" : "pointer", transition: "border-color .15s, background .15s", display: "flex", flexDirection: "column", gap: 7, minHeight: 110 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ width: 16, height: 16, border: `2px solid ${selected ? accent : "#d1d5db"}`, borderRadius: 3, background: selected ? accent : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {selected ? <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 900, lineHeight: 1 }}>✓</span> : null}
        </span>
        {selected ? <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "2px 7px" }}>Selezionato</span> : null}
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: selected ? accent : "#1e293b", lineHeight: 1.25 }}>{card.title}</div>
      {card.badge && selected ? <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 6px", alignSelf: "flex-start" }}>{card.badge}</span> : null}
      <div style={{ fontSize: "0.73rem", color: MUTED, fontStyle: "italic" }}>{card.tag}</div>
      <div style={{ fontSize: "0.76rem", color: "#4b5563", lineHeight: 1.4 }}>{card.desc}</div>
    </div>
  );
}

function SecondaryCheck({ card, checked, onChange, accent, disabled = false }: { card: CardDef; checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void; accent: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: disabled ? "default" : "pointer", padding: "8px 10px", borderRadius: 6, background: checked ? `${accent}06` : "#fff", border: `1px solid ${checked ? accent : "#e5e7eb"}`, transition: "background .12s, border-color .12s" }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ marginTop: 2, accentColor: accent, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: checked ? accent : "#1e293b", lineHeight: 1.3 }}>{card.title}</div>
        <div style={{ fontSize: "0.72rem", color: MUTED, fontStyle: "italic" }}>{card.tag}</div>
      </div>
    </label>
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
export function RevampStep3CompetenzePage() {
  const navigate = useNavigate();
  const { registryType: registryParam } = useParams();
  const { auth } = useAuth();
  const isA = registryParam === "albo-a";
  const isB = registryParam === "albo-b";
  if (!isA && !isB) return <Navigate to="/apply" replace />;

  const accent = isA ? NAVY : GREEN;
  const title = isA ? "Albo A — Professionisti" : "Albo B — Aziende";
  const registryType = isA ? "ALBO_A" : "ALBO_B";
  const integrationEdit = isRevampIntegrationEditFor(registryType, 3);
  const fcr = useFcrEditMode();

  /* ── Albo A state ──────────────────────────────── */
  const [selected,       setSelected]       = useState<string | null>(null);
  const [secondaryRoles, setSecondaryRoles] = useState<Set<string>>(new Set());
  const [atecoQuery,     setAtecoQuery]     = useState("");
  const [atecoError,     setAtecoError]     = useState(false);
  const [mainError,      setMainError]      = useState(false);

  /* ── shared ────────────────────────────────────── */
  const [savedAt,    setSavedAt]    = useState<string | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const isFirstRenderRef = useRef(true);

  /* ── load S3 (Albo A tipologia fields) ── */
  useEffect(() => {
    if (!auth?.token || !isA) return;

    function applyS3(sections: { sectionKey: string; sectionVersion: number; payloadJson: string }[]) {
      const latest = sections.filter(s => s.sectionKey === "S3").sort((a, b) => b.sectionVersion - a.sectionVersion)[0];
      if (!latest) return;
      const data = JSON.parse(latest.payloadJson) as Record<string, unknown>;
      if (data.tipologia)                  setSelected(data.tipologia as string);
      if (Array.isArray(data.multiRuoli))  setSecondaryRoles(new Set(data.multiRuoli as string[]));
      if (data.atecoCode)                  setAtecoQuery(data.atecoCode as string);
      else if (data.ateco)                 setAtecoQuery(data.ateco as string);
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
  }, [auth?.token, registryType, isA]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isA) return;
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    const timer = setTimeout(() => { void handleSaveDraft(); }, 2000);
    return () => clearTimeout(timer);
  }, [selected, secondaryRoles, atecoQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const now = new Date();
    setSavedAt(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  }

  async function handleSaveDraft() {
    if (!auth?.token || !isA) return;
    try {
      const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
      if (!appId) return;
      const professionalType = professionalTypeForTipologia(selected);
      const secondaryProfessionalTypes = professionalTypesForTipologie(secondaryRoles);
      await saveRevampApplicationSection(appId, "S3", JSON.stringify({
        tipologia: selected ?? "",
        professionalType,
        multiRuoli: Array.from(secondaryRoles),
        secondaryProfessionalTypes,
        atecoCode: atecoQuery,
      }), !!selected, auth.token);
      handleSave();
    } catch { /* best-effort */ }
  }

  async function saveSectionProgrammatic() {
    if (!auth?.token || !isA) return;
    const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
    if (!appId) throw new Error("Candidatura non trovata.");
    const professionalType = professionalTypeForTipologia(selected);
    const secondaryProfessionalTypes = professionalTypesForTipologie(secondaryRoles);
    await saveRevampApplicationSection(appId, "S3", JSON.stringify({
      tipologia: selected ?? "",
      professionalType,
      multiRuoli: Array.from(secondaryRoles),
      secondaryProfessionalTypes,
      atecoCode: atecoQuery,
    }), true, auth.token);
  }

  function toggleSecondary(id: string) {
    setSecondaryRoles(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleNext() {
    setSaveError(null);

    if (isA) {
      if (!selected) { setMainError(true); return; }
      if (selected === "altro" && !atecoQuery.trim()) { setAtecoError(true); return; }
      setMainError(false);
      setAtecoError(false);
      sessionStorage.setItem("revamp_tipologia", selected);
      sessionStorage.setItem("revamp_secondary_roles", JSON.stringify(Array.from(secondaryRoles)));
      handleSave();
      let savedAppId: string | null = null;
      if (auth?.token) {
        try {
          const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
          if (appId) {
            savedAppId = appId;
            const professionalType = professionalTypeForTipologia(selected);
            const secondaryProfessionalTypes = professionalTypesForTipologie(secondaryRoles);
            await saveRevampApplicationSection(appId, "S3", JSON.stringify({
              tipologia: selected,
              professionalType,
              multiRuoli: Array.from(secondaryRoles),
              secondaryProfessionalTypes,
              atecoCode: atecoQuery,
            }), true, auth.token);
          }
        } catch {
          setSaveError("Salvataggio non riuscito. Controlla i dati e riprova.");
          return;
        }
      }
      if (integrationEdit && auth?.token && savedAppId) {
        try {
          await completeRevampIntegrationEdit(savedAppId, auth.token, integrationEdit);
          clearRevampIntegrationEditSession();
        } catch {
          setSaveError("Invio integrazione non riuscito. Controlla i dati e riprova.");
          return;
        }
      }
      navigate(integrationEdit?.returnPath ?? `/apply/${registryParam}/step/4/${selected}`);
      return;
    }

    // Albo B — pass-through
    if (integrationEdit && auth?.token) {
      const appId = loadRevampFcrEditSession()?.applicationId ?? loadRevampApplicationIdForRegistry(registryType);
      if (appId) {
        try {
          await completeRevampIntegrationEdit(appId, auth.token, integrationEdit);
          clearRevampIntegrationEditSession();
        } catch {
          setSaveError("Invio integrazione non riuscito. Controlla i dati e riprova.");
          return;
        }
      }
    }
    navigate(integrationEdit?.returnPath ?? `/apply/${registryParam}/step/4`);
  }

  const isAltro   = selected === "altro";
  const secondary = CARDS_A.filter(c => c.id !== selected);
  const info      = selected ? infoMessage(selected) : null;

  return (
    <div style={{ margin: "-1rem", background: "#f0f4f8", minHeight: "100%" }}>
      <PageHeader title={title} subtitle="Sezione 3 · Tipologia" savedAt={savedAt} onSave={() => void handleSaveDraft()} />
      {integrationEdit || fcr.active ? (
        <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "12px 40px", color: "#174f82", fontSize: "0.86rem", fontWeight: 700 }}>
          {fcr.active ? "Richiesta di modifica - Aggiorna solo il gruppo sbloccato, poi salva e invia." : "Integrazione richiesta - Correggi la sezione, salva e invia la risposta."}
        </div>
      ) : (
        <StepBar active={2} accent={accent} />
      )}

      <div style={{ maxWidth: 1120, margin: "24px auto", padding: "0 24px 100px" }}>
        {saveError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: "0.85rem", color: ERR }}>
            {saveError}
          </div>
        )}

        {isA && (
          <>
            {/* ── Card: Tipologia principale ── */}
            <div className={fcr.active ? (fcr.isLocked("tipo_prof") ? "fcr-locked" : "fcr-active-group") : undefined} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
                    Tipologia principale <span style={{ color: ERR }}>*</span>
                  </h2>
                  <p style={{ fontSize: "0.83rem", color: MUTED, margin: 0 }}>
                    Seleziona la tua tipologia principale. La scelta determina le sezioni successive del questionario.
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: mainError ? 14 : 20 }}>
                {CARDS_A.map(card => (
                  <TypeCard key={card.id} card={card} selected={selected === card.id}
                    onClick={() => {
                      setSelected(card.id);
                      setMainError(false);
                      setSecondaryRoles(prev => { const n = new Set(prev); n.delete(card.id); return n; });
                    }}
                    accent={accent}
                    disabled={fcr.active && fcr.isLocked("tipo_prof")}
                  />
                ))}
              </div>
              {mainError && (
                <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: "0.83rem", color: "#b91c1c" }}>
                  ⚠ Seleziona una tipologia professionale per procedere.
                </div>
              )}
              {info && (
                <div style={{ background: INFO_BG, border: `1px solid ${INFO_BORDER}`, borderRadius: 6, padding: "11px 14px", fontSize: "0.83rem", color: INFO_TEXT }}>
                  ℹ {info}
                </div>
              )}
            </div>

            {/* ── Card: Codice ATECO (only when "Altro") ── */}
            {isAltro && (
              <div className={fcr.active ? (fcr.isLocked("ateco") ? "fcr-locked" : "fcr-active-group") : undefined} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${atecoError ? "#fca5a5" : "#e5e7eb"}`, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 4 }}>
                  Codice ATECO principale <span style={{ color: ERR }}>*</span>
                </div>
                <p style={{ fontSize: "0.83rem", color: MUTED, margin: "0 0 14px" }}>
                  Obbligatorio per chi seleziona "Altro professionista". Digita parole chiave per trovare il codice corrispondente alla tua attività.
                </p>
                <input type="text" value={atecoQuery}
                  disabled={fcr.active && fcr.isLocked("ateco")}
                  onChange={e => { setAtecoQuery(e.target.value); if (atecoError) setAtecoError(false); }}
                  placeholder="Es. 85.59 — Corsi tenuti da docenti indipendenti..."
                  style={{ width: "100%", maxWidth: 480, padding: "9px 12px", fontSize: "0.87rem", border: `1.5px solid ${atecoError ? "#fca5a5" : "#d1d5db"}`, borderRadius: 6, outline: "none", boxSizing: "border-box", background: "#fff", color: "#111827" }}
                />
                {atecoError && <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 6 }}>Inserisci il codice ATECO per procedere.</div>}
              </div>
            )}

            {/* ── Card: Disponibilità in più ruoli ── */}
            {selected && (
              <div className={fcr.active ? (fcr.isLocked("comp_secondarie") ? "fcr-locked" : "fcr-active-group") : undefined} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "22px 28px" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 4 }}>
                  Disponibilità a lavorare in più ruoli
                  <span style={{ fontWeight: 400, fontSize: "0.78rem", color: MUTED, marginLeft: 8 }}>opzionale</span>
                </div>
                <p style={{ fontSize: "0.83rem", color: MUTED, margin: "0 0 16px", lineHeight: 1.5 }}>
                  Indica se ti proponi anche in altri ambiti oltre alla tipologia principale selezionata (es. un docente che offre anche consulenza HR). Questa informazione arricchisce le possibilità di ricerca.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {secondary.map(card => (
                    <SecondaryCheck key={card.id} card={card}
                      checked={secondaryRoles.has(card.id)}
                      onChange={() => toggleSecondary(card.id)}
                      accent={accent}
                      disabled={fcr.active && fcr.isLocked("comp_secondarie")}
                    />
                  ))}
                </div>
                {secondaryRoles.size > 0 && (
                  <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#16a34a" }}>
                    ✓ {secondaryRoles.size} {secondaryRoles.size === 1 ? "ruolo aggiuntivo selezionato" : "ruoli aggiuntivi selezionati"}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!fcr.active && (
        <div className="wizard-bottom-nav" style={{ background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 36px", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
          <Link className="wizard-nav-button wizard-nav-button-prev" to={integrationEdit?.returnPath ?? `/apply/${registryParam}/step/2`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 6, fontWeight: 600, fontSize: "0.84rem", color: accent, textDecoration: "none" }}>
            <ArrowLeft size={14} /> {integrationEdit ? "Torna alla richiesta" : "Sezione precedente"}
          </Link>
          {integrationEdit ? (
            <div style={{ fontSize: "0.77rem", color: MUTED, fontWeight: 700 }}>Modalita integrazione</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: "0.77rem", color: MUTED }}>Avanzamento: <strong>60%</strong></span>
              <div style={{ width: 180, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: accent, borderRadius: 2 }} />
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
