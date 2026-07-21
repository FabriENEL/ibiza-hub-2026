@AGENTS.md

# EventGarden — Istruzioni operative

Applicazione installabile (PWA) per organizzare eventi di gruppo, con assistente
conversazionale **J.U.L.I.E.** (*Join Us Living In EventGarden*).

**Ambiente:** Windows · PowerShell · `C:\Users\fabri\alessandro-hub`
**Produzione:** `ibiza-hub-2026.vercel.app` · branch `main`
**Stack:** Next.js 16.2.6 (Turbopack) · Supabase · Vercel · Groq · TypeScript · Tailwind

---

## ⛔ REGOLE INDEROGABILI SU JULIE

L'assistente **è** il prodotto. Un difetto qui non è un bug: è la demo compromessa.
Prima di modificare `app/dashboard/Julie.tsx`, `app/dashboard/JulieDock.tsx`
o `app/api/julie/route.ts`, applicare **tutte** queste regole.

### Non toccare mai senza richiesta esplicita
- La funzione `send` e il ciclo delle richieste
- Il parsing JSON delle azioni (`aggiungi_evento`, `aggiungi_spesa`, `cerca_luoghi`, `proponi_programma`)
- Lo stato `busy` e il congedo della chat (`signalPostAction` + `onClose`)
- I controlli sulle date dell'Hub prima di ogni scrittura
- Il messaggio umano sul sovraccarico (429)

### Il componente `Scrive` — lezione già pagata
Rivela il testo parola per parola e pilota l'avatar parlante.

- **Deve stare FUORI dal componente padre.** Se definito dentro `Julie`, ogni render
  del padre lo rimonta e il ciclo si azzera alla prima parola.
- Le callback (`onBocca`, `onFine`) vanno lette da un `ref`, **mai** messe nelle dipendenze.
- Un solo `useEffect`, dipendenza `[parole]` calcolata con `useMemo`.
- Timer che si auto-richiama con contatore locale, immune ai render del padre.

### Il SYSTEM prompt è patrimonio
`app/api/julie/route.ts` — si **estende**, non si riscrive. Contiene vincoli maturati
sul campo: solo luoghi reali, ritmi orari, categorie come vincolo assoluto,
l'acronimo del nome. Rimuoverne uno fa regredire il prodotto.

### Collaudo obbligatorio
Ogni modifica a Julie si prova **in locale** prima del push. Mai direttamente in produzione.

---

## Comandi e sequenze

```powershell
npm run build                      # SEMPRE prima di ogni push
Remove-Item -Recurse -Force .next  # OBBLIGATORIO dopo build, prima di dev
npm run dev
```

**La pulizia di `.next` non è opzionale.** Turbopack disallinea la cache e restituisce
404 su `/dashboard`. Va inclusa in ogni sequenza senza che venga chiesto.

---

## Modifiche ai file — Windows

### ⛔ Mai `Set-Content -Raw`
Corrompe gli accenti: `ì` diventa `Ã¬`. Un difetto di questo tipo è già arrivato
in produzione ed è stato visto durante una presentazione.

### Metodo corretto
- `(Get-Content) -replace`, oppure script `.ps1` con virgolette singole
- Scrittura con `[System.IO.File]::WriteAllText(path, testo, (New-Object System.Text.UTF8Encoding $false))`
- Per i caratteri accentati nelle stringhe, usare l'escape Unicode: `\u00EC` per `ì`,
  `\u00E8` per `è`, `\u00F2` per `ò`, `\u00E0` per `à`
- Per depositare un escape Unicode LETTERALE sul disco (es. i sei caratteri
  `\u00EC` anziché l'accento), costruire il backslash con `[char]92` in PowerShell:
  il livello di trasporto degli strumenti decodifica `\u00EC` in accento prima
  dell'esecuzione. Esempio: `$new = "'S" + [char]92 + "u00EC, avvisami'"`
- Ancore a riga singola nei replace; per blocchi multiriga, ciclo `foreach` sulle righe
- Ogni script deve avere una guardia: se l'ancora non esiste, stampare
  `--- NON TROVATO ---` e uscire senza scrivere
- Rimuovere gli script dopo l'uso: `Remove-Item .\patch-*.ps1 -ErrorAction SilentlyContinue`

---

## Git e deploy

- `git add` con lista esplicita di file **non aggancia i file nuovi** (untracked).
  Un'immagine è già stata dimenticata così, e il commit è fallito in silenzio.
  Verificare sempre con `git status` che i file compaiano sotto *Changes to be committed*.
- `npm run build` verde **prima** di ogni commit.
- Non dichiarare un deploy riuscito basandosi sul terminale: la conferma è su Vercel.

---

## Struttura

```
app/dashboard/modules/    Calendar · Cassa · Consigli · Gallery · Group · Votes · PushToggle
app/dashboard/            Julie · JulieDock · Shell · Garden · CategorieCard
                          ProgrammaCard · LuoghiCard · PushInvito · page.tsx
app/dashboard/lib/        HubContext · DateTimePicker · eventVisuals
app/api/                  julie · consigli · cover · promemoria · usage · foto · hubs
app/login/                page.tsx
public/                   sw.js · manifest · julie-avatar.png · julie-talking.png
```

---

## Principi appresi

**React**
- Lo stato dell'interfaccia si **preserva** attraverso i ricaricamenti dati, non si
  ricostruisce da zero. Azzerarlo solo se diventa invalido.
- `onClick={fn}` passa l'evento come primo argomento: attenzione se `fn` ha parametri.

**Supabase**
- Le policy vivono nel **database**, non nel repo. Clonando il DB vanno riscritte.
- Le policy permissive si sommano con OR: una sola policy `ALL qual=true` annulla
  tutte le altre corrette.
- `WITH CHECK` non può confrontarsi con la riga precedente: serve un trigger `BEFORE UPDATE`.
- Le viste si estendono solo **in coda**.

**Android / Chrome**
- Chrome emette `pointercancel` appena interpreta il gesto come scorrimento, e da
  quel momento `pointermove` non arriva più.
- Usare eventi touch nativi (`onTouchStart/Move/End/Cancel`) con `touchAction: 'pan-y'`.

**API esterne**
- Google Places: `rating` e `price` sono campi a pagamento e causano errore 429.
  Usare una maschera che li escluda.
- Groq: la soglia di 8 000 token al minuto è **dell'intera organizzazione**, non per utente.

---

## Metodo di lavoro

**Un cantiere alla volta.** Si costruisce, si prova, si consegna. Non si apre un
nuovo fronte finché il precedente non è chiuso.

**I problemi strutturali richiedono correzioni strutturali.** Quattro tentativi
sull'impaginazione del calendario sono falliti perché ritoccavano numeri su un
problema di struttura. Leggere l'intera gerarchia prima di toccare le misure.

**Priorità alla stabilità sotto scadenza.** A ridosso di una dimostrazione, il debito
estetico e strutturale si rimanda se rischia di destabilizzare ciò che funziona.

---

## Registro e comunicazione

Italiano formale. L'interlocutore va chiamato **Signore** o **Capo**, dandogli del **Lei**.
Risposte concise: si preferisce la prova sul campo alle spiegazioni lunghe.
