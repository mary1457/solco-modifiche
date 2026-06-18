import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Copy, Edit2, Info, Mail, Send } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { getRevampApplicationSections, submitRevampApplication } from "../../api/revampApplicationApi";
import { getMissingRequiredSections } from "./revampFlow";
import { loadRevampApplicationIdForRegistry } from "../../utils/revampApplicationSession";

const NAVY  = "#0f2a52";
const GREEN = "#1a5c3a";
const MUTED = "#6b7280";

const STEPS = ["Anagrafica", "Istruzione", "Tipologia", "Competenze", "Dichiarazioni"];

/* ─── label maps ─────────────────────────────────── */
const TIPOLOGIA_LABELS: Record<string, string> = {
  docente:        "Docente / Formatore",
  ricercatore:    "Ricercatore / Valutatore",
  cdo_lavoro:     "Consulente del Lavoro",
  commercialista: "Commercialista",
  avvocato:       "Avvocato / Consulente Legale",
  psicologo:      "Psicologo del Lavoro",
  finanza:        "Esperto di Finanza Agevolata",
  orientatore:    "Orientatore Professionale",
  coach:          "Coach",
  mediatore:      "Mediatore del Lavoro",
  consulente_hr:  "Consulente HR / Sviluppo Organizzativo",
  digital:        "Consulente Digital & E-Learning",
  altro:          "Altro professionista",
};

const TITOLO_LABELS: Record<string, string> = {
  licenza_media:     "Licenza media",
  diploma:           "Diploma di scuola secondaria superiore",
  laurea_triennale:  "Laurea triennale (L)",
  laurea_magistrale: "Laurea magistrale / specialistica (LM/LS)",
  master_1:          "Master universitario di I livello",
  master_2:          "Master universitario di II livello",
  dottorato:         "Dottorato di Ricerca",
  equipollente:      "Titolo equipollente estero",
};

const ANNI_PROF_LABELS: Record<string, string> = {
  meno1:   "meno di 1 anno",
  meno2:   "meno di 2 anni",
  "1_5":   "1–5 anni",
  "2_5":   "2–5 anni",
  "5_10":  "5–10 anni",
  "6_10":  "6–10 anni",
  "10_20": "10–20 anni",
  "11_15": "11–15 anni",
  oltre16: "oltre 16 anni",
  oltre20: "oltre 20 anni",
};

const TAX_REGIME_LABELS: Record<string, string> = {
  ordinario:    "Regime ordinario",
  forfettario:  "Regime forfettario",
  ditta:        "Ditta individuale",
  societa:      "Società (SRL / SNC / SAS / …)",
  associazione: "Associazione / Ente del Terzo Settore",
  altro:        "Altro",
};

const DOCENZA_PA_LABELS: Record<string, string> = {
  si_centrale: "Sì — PA centrale",
  si_locale:   "Sì — PA locale",
  si_entrambe: "Sì — entrambe",
  no:          "No",
};

const DECL_CHECKS: { key: string; label: string }[] = [
  { key: "noCriminalConvictions",          label: "Assenza condanne penali" },
  { key: "noConflictOfInterest",           label: "Assenza conflitti di interesse" },
  { key: "truthfulnessDeclaration",        label: "Veridicità delle informazioni" },
  { key: "privacyAccepted",                label: "Privacy Policy GDPR" },
  { key: "ethicalCodeAccepted",            label: "Codice Etico Solco" },
  { key: "qualityEnvSafetyAccepted",       label: "Standard qualità e sicurezza" },
  { key: "alboDataProcessingConsent",      label: "Trattamento dati Albo Fornitori" },
  { key: "marketingConsent",               label: "Consenso comunicazioni commerciali" },
  { key: "dlgs81ComplianceWhenInPresence", label: "Conformità D.Lgs. 81/2008" },
];

/* ─── components ─────────────────────────────────── */
function SolcoLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "#f5c800", borderRadius: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
      </span>
      <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1a1a2e" }}>Solco<sup style={{ color: "#f5c800", fontSize: "0.5rem", verticalAlign: "super" }}>+</sup></span>
    </div>
  );
}

function PageHeader({ title, accent }: { title: string; accent: string }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 30px" }}>
      <SolcoLogo />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{title}</div>
        <div style={{ fontSize: "0.73rem", color: MUTED }}>Riepilogo candidatura</div>
      </div>
      <span style={{ fontSize: "0.77rem", fontWeight: 700, color: accent, background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: 20, padding: "4px 12px" }}>
        Ultimo step
      </span>
    </div>
  );
}

function StepBar({ accent }: { accent: string }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 40px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
        <div style={{ position: "absolute", top: 17, left: "10%", right: "10%", height: 2, background: accent, zIndex: 0 }} />
        {STEPS.map((step) => (
          <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 1 }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: accent, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>✓</span>
            <span style={{ fontSize: "0.7rem", color: accent, fontWeight: 600, textAlign: "center" }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, editPath, accent, children }: { title: string; editPath: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: accent }}>{title}</div>
        <Link to={editPath} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 6, fontSize: "0.77rem", fontWeight: 600, color: accent, textDecoration: "none" }}>
          <Edit2 size={11} /> Modifica
        </Link>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: "0.83rem" }}>
      <span style={{ color: MUTED, minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#1e293b", fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #f1f5f9", margin: "12px 0" }} />;
}

/* ─── bottom bar badges ───────────────────────────── */
const DECL_BADGES = [
  "Ass. condanne penali",
  "Ass. conflitti interesse",
  "Veridicità informazioni",
  "Privacy Policy GDPR",
  "Codice Etico Solco",
];

const REQUIRED_SECTION_LABELS: Record<string, string> = {
  S1: "Anagrafica",
  S2: "Istruzione e CV",
  S3: "Tipologia",
  S3A: "Competenze docente/formatore",
  S3B: "Competenze professionista",
  S4A: "Competenze docente/formatore",
  S4: "Disponibilità e allegati",
  S5: "Dichiarazioni",
};

function getSectionLabel(key: string): string {
  if (key in REQUIRED_SECTION_LABELS) return REQUIRED_SECTION_LABELS[key];
  if (key.startsWith("S4B_")) {
    const roleId = key.slice(4);
    return `Competenze ${TIPOLOGIA_LABELS[roleId] ?? roleId}`;
  }
  if (key.startsWith("S3B_")) {
    const roleId = key.slice(4);
    return `Competenze ${TIPOLOGIA_LABELS[roleId] ?? roleId}`;
  }
  return key;
}

/* ─── main component ─────────────────────────────── */
type S1 = Record<string, string>;
type S3 = Record<string, unknown>;
type S4 = Record<string, unknown>;

export function RevampRecapPage() {
  const { registryType: registryParam } = useParams();
  const { auth } = useAuth();
  const isA = registryParam === "albo-a";
  const isB = registryParam === "albo-b";
  if (!isA && !isB) return <Navigate to="/apply" replace />;

  const accent = isA ? NAVY : GREEN;
  const title  = isA ? "Albo A — Professionisti" : "Albo B — Aziende";
  const registryType = isA ? "ALBO_A" : "ALBO_B";

  /* ── state ── */
  const [s1, setS1] = useState<S1>(() => JSON.parse(sessionStorage.getItem("revamp_s1") ?? "{}"));
  const [tipologia, setTipologia] = useState(() => sessionStorage.getItem("revamp_tipologia") ?? "");
  const [s3, setS3] = useState<S3>(() => JSON.parse(sessionStorage.getItem("revamp_s3") ?? "{}"));
  const [s4, setS4] = useState<S4>(() => JSON.parse(sessionStorage.getItem("revamp_s4") ?? "{}"));

  const [s2Data,     setS2Data]     = useState<Record<string, unknown>>({});
  const [s3Roles,    setS3Roles]    = useState<{ tipologia?: string; multiRuoli?: string[] }>({});
  const [s4Sections, setS4Sections] = useState<Array<{ roleSlug: string; data: Record<string, unknown> }>>([]);
  const [s5Data,     setS5Data]     = useState<Record<string, unknown>>({});

  const [submitted,      setSubmitted]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [protocolCode,   setProtocolCode]   = useState("");
  const [copied,         setCopied]         = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [submitError,    setSubmitError]    = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.token) return;
    const appId = loadRevampApplicationIdForRegistry(registryType);
    if (!appId) return;
    getRevampApplicationSections(appId, auth.token).then(sections => {
      setMissingSections(getMissingRequiredSections(isA ? "ALBO_A" : "ALBO_B", sections));
      const latest = (...keys: string[]) => sections
        .filter(sec => keys.includes(sec.sectionKey))
        .sort((a, b) => b.sectionVersion - a.sectionVersion)[0];

      // S1 — anagrafica
      const s1sec = latest("S1");
      if (s1sec) {
        const data = JSON.parse(s1sec.payloadJson) as S1;
        setS1(data);
        sessionStorage.setItem("revamp_s1", s1sec.payloadJson);
      }

      if (isA) {
        // S2 — istruzione e CV
        const s2sec = latest("S2");
        if (s2sec) setS2Data(JSON.parse(s2sec.payloadJson) as Record<string, unknown>);

        // S3 — tipologia
        const s3TipSec = latest("S3");
        if (s3TipSec) {
          const s3data = JSON.parse(s3TipSec.payloadJson) as { tipologia?: string; multiRuoli?: string[] };
          setS3Roles(s3data);
          const tip = s3data.tipologia ?? "";
          setTipologia(tip);
          sessionStorage.setItem("revamp_tipologia", tip);

          // S4A + S4B_* — ordered by role sequence
          const roleSeq = [tip, ...(s3data.multiRuoli ?? [])].filter(Boolean);
          const latestByKey = new Map<string, typeof sections[0]>();
          for (const sec of sections) {
            if (sec.sectionKey !== "S4A" && !sec.sectionKey.startsWith("S4B_")) continue;
            const ex = latestByKey.get(sec.sectionKey);
            if (!ex || sec.sectionVersion > ex.sectionVersion) latestByKey.set(sec.sectionKey, sec);
          }
          const ordered: Array<{ roleSlug: string; data: Record<string, unknown> }> = [];
          for (const role of roleSeq) {
            const key = role === "docente" ? "S4A" : `S4B_${role}`;
            const sec = latestByKey.get(key);
            if (sec) ordered.push({ roleSlug: role, data: JSON.parse(sec.payloadJson) as Record<string, unknown> });
          }
          setS4Sections(ordered);

          const s4aSec = latestByKey.get("S4A");
          if (s4aSec) {
            const data = JSON.parse(s4aSec.payloadJson) as S3;
            setS3(data); setS4(data as unknown as S4);
            sessionStorage.setItem("revamp_s3", s4aSec.payloadJson);
            sessionStorage.setItem("revamp_s4", s4aSec.payloadJson);
          }
        }

        // S5 — dichiarazioni
        const s5sec = latest("S5");
        if (s5sec) setS5Data(JSON.parse(s5sec.payloadJson) as Record<string, unknown>);

      } else {
        // Albo B
        const s2sec = latest("S2");
        if (s2sec) {
          const s2data = JSON.parse(s2sec.payloadJson) as Record<string, unknown>;
          const tip = (s2data.tipologia as string) ?? "";
          setTipologia(tip);
          sessionStorage.setItem("revamp_tipologia", tip);
        }
        const s3sec = latest("S3", "S3A", "S3B");
        if (s3sec) {
          const data = JSON.parse(s3sec.payloadJson) as S3;
          setS3(data);
          sessionStorage.setItem("revamp_s3", s3sec.payloadJson);
        }
        const s4sec = latest("S4");
        if (s4sec) {
          const data = JSON.parse(s4sec.payloadJson) as S4;
          setS4(data);
          sessionStorage.setItem("revamp_s4", s4sec.payloadJson);
        }
      }
    }).catch(() => {
      setSubmitError("Impossibile verificare il salvataggio sul server. Riprova.");
    });
  }, [auth?.token, isA, isB, registryType]);

  async function handleInvia() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const appId = loadRevampApplicationIdForRegistry(registryType);
      if (!appId || !auth?.token) {
        setSubmitError("Sessione non valida. Rientra nell'area fornitore e riprova.");
        setSubmitting(false);
        return;
      }
      const sections = await getRevampApplicationSections(appId, auth.token);
      const missing = getMissingRequiredSections(isA ? "ALBO_A" : "ALBO_B", sections);
      setMissingSections(missing);
      if (missing.length > 0) {
        setSubmitError("Completa e salva sul server tutte le sezioni obbligatorie prima di inviare.");
        setSubmitting(false);
        return;
      }
      const submittedSummary = await submitRevampApplication(appId, auth.token);
      setProtocolCode(submittedSummary.protocolCode ?? "");
      sessionStorage.setItem("revamp_proto", submittedSummary.protocolCode ?? "");
    } catch {
      setSubmitError("Invio non riuscito. Riprova.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(protocolCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (submitted) {
    const userEmail = s1.email || "la tua e-mail";
    return (
      <div style={{ margin: "-1rem", background: "#fff", minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid #e5e7eb" }}>
          <SolcoLogo />
          <span style={{ fontSize: "0.82rem", color: MUTED }}>{userEmail}</span>
        </div>
        <div style={{ background: "#f0fdf4", padding: "52px 24px 40px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 size={36} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#15803d", margin: "0 0 10px" }}>Candidatura inviata con successo!</h1>
          <p style={{ fontSize: "0.9rem", color: "#16a34a", margin: 0 }}>Il tuo profilo è ora in attesa di revisione da parte del Gruppo Solco.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 24px 0" }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px 40px", textAlign: "center", minWidth: 320, boxShadow: "0 2px 12px #0001" }}>
            <div style={{ fontSize: "0.75rem", color: MUTED, marginBottom: 10, letterSpacing: "0.04em" }}>Codice di protocollo</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e293b", letterSpacing: "0.08em", border: "2px solid #0f2a52", borderRadius: 8, padding: "10px 28px", marginBottom: 14, fontFamily: "monospace" }}>{protocolCode}</div>
            <button type="button" onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, color: copied ? "#16a34a" : "#374151", cursor: "pointer" }}>
              <Copy size={13} /> {copied ? "Copiato!" : "Copia codice"}
            </button>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "12px 0 0", lineHeight: 1.5 }}>Conserva questo codice per ogni comunicazione con il Gruppo Solco.</p>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, width: "100%" }}>
          {[
            { icon: <Mail size={16} color="#15803d" />, title: "E-mail di conferma", text: `Riceverai una e-mail a ${userEmail} con il riepilogo completo della candidatura.` },
            { icon: <Clock size={16} color="#15803d" />, title: "Tempi di revisione", text: "Il tuo profilo sarà esaminato entro 10 giorni lavorativi. Riceverai una notifica via e-mail sull'esito." },
            { icon: <Info size={16} color="#15803d" />, title: "Cosa succede ora", text: "Se la documentazione fosse incompleta, riceverai una richiesta di integrazione via e-mail." },
          ].map(card => (
            <div key={card.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>{card.icon}<span style={{ fontWeight: 700, fontSize: "0.87rem", color: "#1e293b" }}>{card.title}</span></div>
              <p style={{ fontSize: "0.81rem", color: MUTED, margin: 0, lineHeight: 1.6 }}>{card.text}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: "36px 24px 12px" }}>
          <Link to={`/apply/${registryParam}/my-profile`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", background: "#0f2a52", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
            Accedi alla tua area riservata →
          </Link>
        </div>
        <div style={{ textAlign: "center", padding: "16px 24px 32px" }}>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 4px" }}>Troverai la tua area personale sempre accessibile da solco.it/albo-fornitori</p>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>© {new Date().getFullYear()} Gruppo Solco</p>
        </div>
      </div>
    );
  }

  /* ── derived display values ── */
  const fullName       = (s1.fullName as string) || "—";
  const indirizzo      = [s1.address, s1.postalCode, s1.city, s1.province].filter(Boolean).join(", ") || undefined;
  const taxRegimeLabel = TAX_REGIME_LABELS[s1.taxRegime] ?? s1.taxRegime ?? undefined;
  const tipologiaLabel = (TIPOLOGIA_LABELS[tipologia] ?? tipologia) || "—";

  // Albo B compat
  const espCount   = (s4.espCount as number | undefined) ?? 0;
  const committenti = (s4.committenti as string[] | undefined) ?? [];
  const periodi    = (s4.periodi as string[] | undefined) ?? [];

  // Albo A: CV from S2
  const cvAttachment = Array.isArray(s2Data.attachments)
    ? (s2Data.attachments as Array<Record<string, unknown>>).find(a => a.documentType === "CV")
    : null;

  return (
    <div style={{ margin: "-1rem", background: "#f0f4f8", minHeight: "100%" }}>
      <PageHeader title={title} accent={accent} />
      <StepBar accent={accent} />

      <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "14px 36px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.2rem" }}>✓</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#15803d" }}>Tutto pronto! Rivedi il riepilogo prima di inviare.</div>
          <div style={{ fontSize: "0.8rem", color: "#16a34a" }}>Puoi modificare ogni sezione cliccando su "Modifica". Quando sei soddisfatto, clicca su "Invia candidatura ufficialmente".</div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "24px auto", padding: "0 24px 110px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT column */}
        <div>
          {/* Anagrafica */}
          <Card title="Dati Personali" editPath={`/apply/${registryParam}`} accent={accent}>
            <FieldRow label="Nome e Cognome" value={fullName} />
            <FieldRow label="Codice Fiscale" value={s1.taxCode} />
            {s1.vatNumber && <FieldRow label="Partita IVA" value={s1.vatNumber} />}
            {taxRegimeLabel && <FieldRow label="Regime fiscale" value={taxRegimeLabel} />}
            <Divider />
            <FieldRow label="E-mail principale" value={s1.email} />
            <FieldRow label="Telefono" value={s1.phone ? `+39 ${s1.phone}` : undefined} />
            <Divider />
            <FieldRow label="Indirizzo" value={indirizzo} />
            {s1.linkedin && <><Divider /><FieldRow label="LinkedIn" value={s1.linkedin} /></>}
          </Card>

          {/* Istruzione e CV — Albo A only */}
          {isA && (
            <Card title="Istruzione e CV" editPath={`/apply/${registryParam}/step/2`} accent={accent}>
              <FieldRow label="Titolo di studio" value={TITOLO_LABELS[s2Data.titoloStudio as string] ?? (s2Data.titoloStudio as string | undefined)} />
              <FieldRow label="Anno conseguimento" value={s2Data.annoConseg as string | undefined} />
              {s2Data.ambitoDropdown ? <FieldRow label="Ambito" value={s2Data.ambitoDropdown as string} /> : null}
              {s2Data.ambitoStudio ? <FieldRow label="Indirizzo di studio" value={s2Data.ambitoStudio as string} /> : null}
              {cvAttachment && <><Divider /><FieldRow label="CV allegato" value={cvAttachment.fileName as string} /></>}
            </Card>
          )}

          {/* Albo B — Tipologia e Competenze */}
          {!isA && (
            <Card title="Tipologia e Competenze" editPath={`/apply/${registryParam}/step/2`} accent={accent}>
              <FieldRow label="Tipologia principale" value={tipologiaLabel} />
              <Divider />
              <FieldRow label="Titolo di studio" value={TITOLO_LABELS[s3.titoloB as string] ?? (s3.titoloB as string | undefined)} />
              <FieldRow label="Anni di esperienza" value={ANNI_PROF_LABELS[s3.anniEsp as string] ?? (s3.anniEsp as string | undefined)} />
              {s3.ordine ? <FieldRow label="Ordine professionale" value={s3.ordine as string} /> : null}
              <FieldRow label="Ambito di studio" value={s3.ambitoB as string | undefined} />
            </Card>
          )}
        </div>

        {/* RIGHT column */}
        <div>
          {isA ? (
            <>
              {/* Tipologia (S3) */}
              <Card title="Tipologia professionale" editPath={`/apply/${registryParam}/step/3`} accent={accent}>
                {s3Roles.tipologia && (
                  <div>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: MUTED, marginBottom: 6, display: "block" }}>Tipologia principale</span>
                    <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: `${accent}15`, color: accent, fontWeight: 700, fontSize: "0.84rem", border: `1px solid ${accent}30` }}>
                      {TIPOLOGIA_LABELS[s3Roles.tipologia] ?? s3Roles.tipologia}
                    </span>
                  </div>
                )}
                {(s3Roles.multiRuoli ?? []).length > 0 && (
                  <>
                    <Divider />
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: MUTED, marginBottom: 8, display: "block" }}>Tipologie secondarie</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(s3Roles.multiRuoli ?? []).map(r => (
                        <span key={r} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: "#f1f5f9", color: "#374151", fontWeight: 600, fontSize: "0.8rem", border: "1px solid #e2e8f0" }}>
                          {TIPOLOGIA_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* One competenze card per role */}
              {s4Sections.map(({ roleSlug, data }) => {
                const rLabel  = TIPOLOGIA_LABELS[roleSlug] ?? roleSlug;
                const isDoc   = roleSlug === "docente";
                const areeCount  = Array.isArray(data.aree) ? (data.aree as string[]).length : 0;
                const esprCount  = Array.isArray(data.esperienze) ? (data.esperienze as unknown[]).length : 0;
                const regioni    = data.tuttaItaliaA === true
                  ? "Tutta Italia"
                  : Array.isArray(data.regioniA) && (data.regioniA as string[]).length > 0
                    ? (data.regioniA as string[]).join(", ")
                    : undefined;
                const anniLabel  = ANNI_PROF_LABELS[data.anniEsp as string] ?? (data.anniEsp as string | undefined);
                const serviziList = Array.isArray(data.servizi) ? (data.servizi as string[]) : [];
                const editPath   = isDoc
                  ? `/apply/${registryParam}/step/4/docente`
                  : `/apply/${registryParam}/step/4/${roleSlug}`;
                return (
                  <Card key={roleSlug} title={`Competenze · ${rLabel}`} editPath={editPath} accent={accent}>
                    {isDoc ? (
                      <>
                        {areeCount > 0 && <FieldRow label="Aree tematiche" value={`${areeCount} ${areeCount === 1 ? "area" : "aree"} selezionate`} />}
                        {data.docenzaPA && <FieldRow label="Docenza PA" value={DOCENZA_PA_LABELS[data.docenzaPA as string] ?? (data.docenzaPA as string)} />}
                        {regioni && <FieldRow label="Area territoriale" value={regioni} />}
                        {esprCount > 0 && <FieldRow label="Esperienze formative" value={`${esprCount} esperienza/e`} />}
                        {Array.isArray(data.lingue) && (data.lingue as string[]).filter(Boolean).length > 0 && (
                          <FieldRow label="Lingue" value={(data.lingue as string[]).filter(Boolean).join(", ")} />
                        )}
                        {data.certAbitazioni && <FieldRow label="Certificazioni" value={data.certAbitazioni as string} />}
                      </>
                    ) : (
                      <>
                        {anniLabel && <FieldRow label="Anni di esperienza" value={anniLabel} />}
                        {data.ordine && <FieldRow label="Ordine professionale" value={data.ordine as string} />}
                        {serviziList.length > 0 && (
                          <FieldRow label="Servizi offerti" value={serviziList.slice(0, 3).join(", ") + (serviziList.length > 3 ? ` (+${serviziList.length - 3})` : "")} />
                        )}
                        {data.altroServ && <FieldRow label="Altro" value={data.altroServ as string} />}
                        {data.certB && <FieldRow label="Certificazioni" value={data.certB as string} />}
                      </>
                    )}
                  </Card>
                );
              })}

              {/* Dichiarazioni (S5) */}
              {Object.keys(s5Data).length > 0 && (
                <Card title="Dichiarazioni" editPath={`/apply/${registryParam}/step/5`} accent={accent}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {DECL_CHECKS.filter(d => s5Data[d.key] === true).map(d => (
                      <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "1rem", lineHeight: 1 }}>✓</span>
                        <span style={{ color: "#1e293b", fontWeight: 500 }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            /* Albo B — disponibilità */
            <Card title="Disponibilità e Allegati" editPath={`/apply/${registryParam}/step/4`} accent={accent}>
              <FieldRow label="Area territoriale" value={s4.areaTerrB as string | undefined} />
              {s4.tariffaOraB ? <FieldRow label="Tariffa oraria" value={s4.tariffaOraB as string} /> : null}
              {espCount > 0 && (
                <>
                  <Divider />
                  <FieldRow label="Esperienze inserite" value={`${espCount} esperienza/e`} />
                  {committenti.slice(0, 3).map((c, i) => (
                    <FieldRow key={i} label={`  · Committente ${i + 1}`} value={`${c}${periodi[i] ? ` (${periodi[i]})` : ""}`} />
                  ))}
                </>
              )}
              {(s4.cvName as string | null) && <><Divider /><FieldRow label="CV allegato" value={s4.cvName as string} /></>}
            </Card>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "10px 30px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {DECL_BADGES.map(b => (
            <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: "0.72rem", color: "#15803d", fontWeight: 600 }}>
              ✓ {b}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            to={`/apply/${registryParam}/step/5`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 6, fontWeight: 600, fontSize: "0.84rem", color: accent, textDecoration: "none" }}
          >
            <ArrowLeft size={14} /> Torna indietro
          </Link>
          <button
            type="button"
            onClick={() => void handleInvia()}
            disabled={submitting || missingSections.length > 0}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 26px", background: missingSections.length > 0 ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: "0.9rem", cursor: submitting || missingSections.length > 0 ? "not-allowed" : "pointer", boxShadow: missingSections.length > 0 ? "none" : "0 2px 8px #16a34a40", opacity: submitting ? 0.7 : 1 }}
          >
            <Send size={15} /> {submitting ? "Invio in corso..." : "Invia candidatura ufficialmente"}
          </button>
        </div>
        {(missingSections.length > 0 || submitError) && (
          <div style={{ marginTop: 8, textAlign: "center", fontSize: "0.78rem", color: "#b91c1c" }}>
            {submitError ?? `Sezioni non salvate sul server: ${missingSections.map(getSectionLabel).join(", ")}`}
          </div>
        )}
      </div>
    </div>
  );
}
