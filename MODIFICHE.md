# Registro Modifiche — Solco Platform

---

## 1. Albo A — Persone Fisiche

**File:** `frontend/src/pages/revamp/RevampApplicationStep1Page.tsx`
**File:** `frontend/src/pages/revamp/RevampApplicationStep2Page.tsx`
**File:** `frontend/src/pages/revamp/RevampApplicationStep3Page.tsx`
**File:** `frontend/src/pages/revamp/RevampApplicationStep4Page.tsx`
**File:** `frontend/src/pages/revamp/RevampApplicationStep5Page.tsx`
**File:** `frontend/src/pages/revamp/RevampStep2TipologiaPage.tsx`
**File:** `frontend/src/pages/revamp/RevampStep3CompetenzePage.tsx`
**File:** `frontend/src/pages/revamp/RevampStep4DisponibilitaPage.tsx`
**File:** `frontend/src/pages/revamp/RevampStep5DichiarazioniPage.tsx`

### 1.1 Step 1 — Documento & Dati

**Documento**
- Campo "Data di scadenza": formato slash automatico (MM/AAAA), non accetta date passate

**Dati Personali**
- Nome e cognome uniti in un unico campo
- Campo "Data di nascita": formato slash automatico (DD/MM/AAAA)
- "Luogo di nascita" e "Provincia" separati in due campi distinti

**Dati Fiscali**
- Campo "Codice fiscale"
- Campo "Cassa": flag Sì / No
- "Partita IVA" con prefisso paese selezionabile (es. IT)
- "Provincia": menu a tendina
- "Stato" e "Regione": campi distinti

**Sezione Intermedia**
- Titoli di studio spostati nella Sezione 3A (posizione corretta nel flusso)

### 1.2 Step 2 — Tipologia
- Tipologia principale: Step 3A e 3B rifatti
- Tipologia secondaria: Step 4A e 4B rifatti

### 1.3 Step 3A — Ambiti e Indirizzi
- Campo "Ambito" obbligatorio, separato da "Indirizzo"
- Campo "Indirizzo" obbligatorio, separato da "Ambito"
- Menu tendina "Ambito" visibile solo da Laurea Triennale in poi

### 1.4 Step 3B — Esperienze & Competenze
- Range anni esperienza aggiornato in tutti i campi:
  - Meno di 1 / 1–5 / 6–10 / 11–15 / Oltre 16
- **Lingue straniere:** bottone `[+]` per aggiungere più lingue con livello di esperienza distinto
  - Default: Italiano con esperienza "Oltre 16"
  - Clic su `[+]` aggiunge una nuova lingua con range selezionabile
  - Logica replicata per tutte le competenze nel Box B
- **Area territoriale:** sostituito il campo testo con selezione delle 20 regioni + "Tutta Italia"
  - Se selezionate solo alcune regioni → appare menu a tendina per le province
- **Lingue parlate:** una lingua di default con menu a tendina livello (A1–C2), bottone `[+]` per aggiungerne altre

### 1.5 Step 4 — Esperienze (rinominato)
- Step rinominato in "Esperienze"
- Rimossa la Sezione C

**Sezione D**
- Rimosso il campo "Tipo di intervento"
- Voci menu "Modalità di erogazione" aggiornate con lista fornita dal cliente
- Campi "Periodi": formato slash automatico, struttura data verificata
- Aggiunto campo "Durata totale in ore"
- Rimosso il campo "Numero partecipanti"
- Campo "Finanziata": Sì / No; se Sì → campo opzionale "Fondo/Programma"
- Rimossa la sezione Referenze

### 1.6 Step 5 — Consensi
- Aggiunto bottone **"Seleziona tutti i consensi obbligatori"**

---

## 2. Albo B — Step 4 (Certificazioni)

**File:** `frontend/src/pages/revamp/RevampAlboBStep4CertificazioniPage.tsx`
**File:** `backend/src/main/java/com/supplierplatform/revamp/service/RevampSectionPayloadValidator.java`

### 1.1 Campo Scadenza Visura Camerale
- Il campo "Scadenza" è ora sulla stessa riga del caricamento della Visura camerale (layout inline, `gridTemplateColumns: "1fr 180px"`)
- Aggiunto auto-slash: digitando `06` diventa `06/` automaticamente
- Accetta solo date valide (MM/YYYY) e solo date nel futuro

### 1.2 Company Profile
- Spostato su una riga separata (larghezza piena)
- Reso obbligatorio sia lato frontend (validazione con messaggio di errore) che lato backend (`validateAlboBS4` richiede l'allegato `COMPANY_PROFILE`)

### 1.3 Rimosso il box giallo di avviso
- Rimosso il box `⚠ La visura camerale è obbligatoria...`

### 1.4 Scadenza per tutti i certificati ISO
- Funzione `formatScadenzaInput` applicata a tutti i campi "Scadenza certificato" nelle certificazioni ISO
- Auto-slash attivo su tutti, solo date valide, solo date nel futuro

### 1.5 Asterisco rosso sul PDF certificato
- Aggiunto `required` al `FileInput` del certificato PDF per tutte le certificazioni ISO

---

## 2. Albo B — Step 5 (Dichiarazioni)

**File:** `frontend/src/pages/revamp/RevampAlboBStep5DichiarazioniPage.tsx`

- Testo modificato da:
  > "Confermata dal DURC **allegato** e dalla piena regolarità fiscale dell'azienda alla data di iscrizione."
- A:
  > "Confermata dal DURC e dalla piena regolarità fiscale dell'azienda alla data di iscrizione."

---

## 3. Admin — Esamina Candidatura (Documenti Allegati)

**File:** `frontend/src/pages/admin/AdminApplicationCasePage.tsx`

- Per le candidature **Albo B**, viene ora mostrata la **carta d'identità del legale rappresentante** (caricata nello Step 1) nella sezione "Documenti allegati"
- Il documento viene estratto dal payload S1 → `legalRepresentative.idDocumentAttachment`

---

## 4. Admin — Valutazioni

**File:** `frontend/src/pages/admin/AdminEvaluationsPage.tsx`
**File:** `frontend/src/api/adminEvaluationApi.ts`
**File:** `backend/src/main/java/com/supplierplatform/revamp/model/RevampEvaluation.java`
**File:** `backend/src/main/java/com/supplierplatform/revamp/repository/RevampEvaluationRepository.java`
**File:** `backend/src/main/java/com/supplierplatform/revamp/service/RevampEvaluationService.java`
**File:** `backend/src/main/java/com/supplierplatform/revamp/service/RevampEvaluationAssignmentService.java`
**File:** `backend/src/main/java/com/supplierplatform/revamp/api/RevampEvaluationController.java`
**File:** `database/migrations/V11__evaluations_allow_multiple_per_viewer.sql`

### 4.1 Aggiunto criterio "Valutazione aula"
- Aggiunto come 6° criterio (chiave: `classroom`) nell'array `DIMENSIONS`
- Non obbligatorio: i criteri senza punteggio vengono esclusi dalla media

### 4.2 Criteri non valorizzati esclusi dalla media
- Frontend: i criteri con valore 0 non contribuiscono alla media
- Backend: `calculateAverageScore` filtra `d.getScore() != null && d.getScore() > 0`
- Obbligatorio compilare almeno 1 criterio su 6 per inviare

### 4.3 Rimosso il testo "Da compilare"
- Le stelle non valorizzate non mostrano più il testo "Da compilare"

### 4.4 Modalità append (ogni valutazione si aggiunge, non sostituisce)
- Rimossa la logica di upsert: ogni invio crea sempre un nuovo record
- Rimosso il vincolo unique `uk_evaluation_supplier_evaluator` dal database (migrazione V11)
- Il pulsante "Ri-valuta" è diventato **"Aggiungi valutazione"**
- Il form mostra sempre l'intestazione **"Nuova valutazione"**
- Backend: metodo rinominato da `upsertEvaluation` a `addEvaluation`

### 4.5 "La mia valutazione" mostra la media di tutte le valutazioni del viewer
- Mostra la media complessiva di tutte le valutazioni date da quel viewer
- Mostra il conteggio delle valutazioni date

### 4.6 Analytics scopati per viewer
- Quando il caller è VIEWER, le analytics mostrano solo le sue valutazioni (default)
- Aggiunto parametro `allViewers=true` per ottenere i dati aggregati di tutti i viewer

### 4.7 Tab Valutati
- Mostra **tutti i fornitori con almeno una valutazione da qualsiasi viewer**
- Rimosse le colonne **VALUTATORE** e **DATA** dalla lista
- Il punteggio in "Esito" è la **media di tutti i viewer**
- "Apri dettagli" mostra solo **Medie per categoria** e **Distribuzione punteggi** (aggregati di tutti i viewer)
- Nessun form di valutazione, nessun pulsante azione nel pannello dettaglio di questa tab

### 4.8 Tab Da valutare
- Mostra **tutti i fornitori approvati** con il loro stato per il viewer loggato
- Fornitori non ancora valutati dal viewer e fornitori già valutati entrambi visibili
- "Apri dettagli" mostra solo le valutazioni di **quel viewer specifico** (non tutti i viewer)
- Permette di aggiungere nuove valutazioni dal pannello dettaglio
- **Bug fix:** corretto `IncorrectResultSizeDataAccessException` nel metodo `listAssignments` che causava la lista vuota quando un viewer aveva più valutazioni per lo stesso fornitore — ora usa `findAllBy...` con `.stream().findFirst()` invece di `findBy...` (Optional)

### 4.9 Anno collaborazione
- Il campo "Periodo collaborazione" è stato cambiato in **"Anno collaborazione"**
- Accetta solo un anno (numero intero)
- Non può essere un anno futuro (max = anno corrente)
- Validazione sia nel browser (input `type="number"` con `max`) che nel submit handler

### 4.10 Testo pulsante submit
- Il pulsante blu di invio nel form valutazione ora dice sempre **"Aggiungi"** (non più "Aggiorna" o "Invia valutazione")

---

## 5. File di test aggiornati

**File:** `backend/src/test/java/com/supplierplatform/revamp/service/RevampEvaluationServiceTest.java`
**File:** `backend/src/test/java/com/supplierplatform/revamp/api/RevampEvaluationControllerContractTest.java`

- `upsertEvaluation` → `addEvaluation` in tutti i test
- Secondo test aggiornato da "aggiorna valutazione esistente" a "crea sempre un nuovo record"

---

## 6. Database

**File:** `database/migrations/V11__evaluations_allow_multiple_per_viewer.sql`

```sql
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS uk_evaluation_supplier_evaluator;
```

Rimuove il vincolo unique che impediva a un viewer di avere più valutazioni per lo stesso fornitore.
