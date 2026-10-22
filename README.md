# BOM Studio 🚀

A responsive full-stack web app for electronics engineers and DIY builders: search components on **Mouser** or **DigiKey**, import a Bill of Materials (part-number BOMs or Tube Amp CAD keyword BOMs), see live USD pricing and stock, pick the best part by fit, manufacturer reputation and price, and send the result to the supplier's cart or BOM tool.

Current version: **0.4.4**. The version is shown next to "BOM Studio" in the header (read from `package.json`). Live at [aerocat.tech/bom](https://aerocat.tech/bom).

**At a glance**
- Mouser / DigiKey switcher, each with its own BOM (never mixed).
- Tube Amp CAD keyword import, reading values and ratings from the `Rating / data` column.
- All prices in USD.
- Per-line SMD checkbox, row checkboxes with **Delete selected**.
- Capacitor searches step up to higher standard voltages when none are found; zero-stock caps and resistors retry other value notations.
- 0-100 part score from manufacturer reputation tier and price.
- Export as Mouser or DigiKey BOM upload CSV, Excel, CSV or TSV; Mouser cart via the Cart API.
- BOMs live only in your browser's `localStorage`.
- Docker image for server deployment, ready-to-run builds for Windows/macOS/Linux.

---

## ⬇️ Download & Run (no build needed)

Ready-to-run builds for Windows, macOS and Linux are attached to every [GitHub release](../../releases/latest).
Install [Node.js 20+](https://nodejs.org/), unpack the archive for your system, and run `start.cmd` (Windows) or `./start.sh` (Linux/macOS). The app opens at http://localhost:3000.

### Server (aerocat.tech/bom)

Each release also publishes a Docker image, `ghcr.io/kothf/mouser-bom-app:<version>` and `:latest`, built for the `/bom` path. On the server, next to `docker-compose.yml`:

```bash
docker compose pull && docker compose up -d
```

On the NUC that serves aerocat.tech, `/bom` follows `main` instead: cron runs `deploy/nuc/auto-deploy.sh` every 5 minutes, and when `main` has moved it builds the image locally, restarts the container and checks it. The live commit is at `https://aerocat.tech/bom/version.txt`. Details, rollback and setup are in [deploy/nuc/README.md](deploy/nuc/README.md).

The server holds no API keys: this is a public site, so every visitor enters their own Mouser key and DigiKey Client ID/Secret in **Settings**, where they stay in that browser. If the package is private, run `docker login ghcr.io` once with a GitHub token that has `read:packages`.

Releases are built by `.github/workflows/release.yml`: every merge to `main` whose `package.json` version has no release yet publishes `v<version>` automatically (pushing a `v*` tag or running the workflow manually works too). Bump the version to ship a new release.

---

## ⚡ Key Features

### 0. Mouser and DigiKey, kept apart
- A **supplier switcher** at the top selects Mouser or DigiKey. Each supplier has its **own BOM**, own browser storage and own cart flow, so results are never mixed in one BOM.
- **BOMs stay in your browser.** They are saved only in this browser's `localStorage` and never sent to the server, so other visitors of a shared deployment cannot see them. A BOM does not follow you to another browser or device.
- **DigiKey Product Information API v4**: part-number lookup (product details, falling back to exact keyword matches) and keyword search, with OAuth2 client-credentials tokens cached on the server and a rate limiter tuned for DigiKey's 120 requests/minute.
- **Same features on both**: part-number and keyword search, the SMD box (BOM lines and the add-line dialog), capacitor voltage fallback, value notation retries, Find Alternate ranking, CAD and file import, USD prices, exports, and API keys kept only in the browser. A part number with a Mouser manufacturer prefix (`80-C4AF3BW4470A3FK`) is retried without it on both suppliers. The only difference is the cart (below).
- **DigiKey cart**: DigiKey has no public cart API comparable to Mouser's, so **Copy DigiKey Cart List** copies `Quantity, DigiKey Part Number, Customer Reference` lines and opens the DigiKey cart for pasting.

### 0b. Tube Amp CAD import by keywords
- The **Tube Amp CAD (Keywords)** tab reads BOM exports that list components by type and value instead of part numbers, e.g. `C1, Cap, 22uF, 450V, electrolytic`, `R1-R4 Res 100k 1W`, `V1 Tube 12AX7`.
- Works with CSV, TSV, semicolon-separated, plain text and Excel exports, with or without a header row (`Ref`/`Designators`, `Type`, `Value`, `Rating / data`, `Voltage`, `Power`, `Qty`, `Description`).
- **Fixed-width text tables** (columns padded with spaces and a `---- ---` ruler under the header, as in the GUB-245-01 BOM export) are cut by column, so commas inside cells like `C7, C8` or `Capacitor, electrolytic` don't split them. Tab-aligned tables work too.
- **Title lines above the table** (`BILL OF MATERIALS`, project name, revision...) are skipped: the header row is found within the first 10 lines.
- **Ratings come from the `Rating / data` column** (also `Rating`, `Data`, `Spec`): for capacitors, resistors and pots its voltage, wattage, tolerance and type words go into the search query, e.g. `400 V` → `6.8uF 400V Capacitor`, `5 W` → `180 Ohm 5W Resistor`. A bare number is volts for a capacitor and watts for a resistor. Other columns such as `Sim. max` are ignored.
- With a `Value` column, tubes, transformers, sockets and speakers search by that cell (`6P14P Vacuum Tube`, `Hammond 373BX Transformer`, `4 Ohm Loudspeaker`).
- **Capacitors step up in voltage, never down**: when a capacitor search finds nothing at the rated voltage, the next standard ratings above it are tried (up to 3, e.g. `400V` → `450V`, `500V`, `550V`) and the row notes the rating picked (`No 400V part found, picked a 450V one`). A lower voltage is never used.
- Recognises capacitance (`22uF`, `4n7`, `0.1µF`), resistance (`100k`, `4k7`, `470R`, `1M5`, `10kΩ`), inductance (`5H`), voltage (`450V`, `630 V`), power (`1W`, `1/2W`, `0.25 W`), tolerance, designator ranges (`R1-R4`) and quantity markers (`x4`, `qty 2`).
- Identical components are merged and quantities summed. Each line becomes a keyword search on the selected supplier, and the best in-stock match is picked (shown with a "Keyword" tag so it can be reviewed or replaced). Lines that can't be classified are listed as skipped.
- **Nothing in stock? Other notations are tried**: a capacitor or resistor line whose best match has zero stock is searched again with the value written another way (`470nF` → `0.47uF`, `470000pF`; `4.7k Ohm` → `4K7`, `4700 Ohm`), and an in-stock part with the line's mounting is used instead, with a note on the row.
- **Replacements follow the SMD box**: *Find Alternate* shows only through-hole (non-SMD) parts when the line's SMD box is unticked, and only SMD parts when it is ticked. It searches every notation of the value and lists in-stock parts first.
- **Manufacturer and price scores**: among parts that fit the line (mounting, stock, values), a well-rated manufacturer and a lower price win. Each part gets a 0-100 score, half manufacturer rating and half price (cheapest result = 100). Find Alternate shows the score and sorts by it after stock. A part that misses one of the line's values never wins on brand or price. Manufacturer tiers come from DIY/engineering forums (EEVblog, diyAudio, Music Electronics Forum, AmpGarage) and capacitor tier lists, in `src/lib/scoring/manufacturers.ts`:
  - Tier 1 (100): Nichicon, Nippon/United Chemi-Con, Rubycon, Panasonic, Elna, Suncon, F&T, WIMA, Kemet, Cornell Dubilier/Mallory, TDK/EPCOS, Murata, AVX, Taiyo Yuden, Würth, Vishay (Dale, Sprague, BC, Roederstein, Draloric), KOA Speer, Bourns, Ohmite, Susumu, TE/Neohm, Alps, Littelfuse, Schurter, Hammond.
  - Tier 2 (75): Yageo, Royal Ohm, Stackpole, CTS, Alpha, Illinois Capacitor, Taicon, Teapo, SamXon, OST, Samsung, JJ, current-production tube brands.
  - Tier 3 (35): Lelon/Xicon, Jamicon, CapXon, Hitano, Multicomp. Tier 4 (0): Su'scon, Fuhjyyu, G-Luxon, Ltec, Jun Fu, Evercon. Unlisted makers score 50.
- **Keywords are configurable** under *Edit keywords*: `Category: keyword, keyword | designator prefixes` (defaults: Cap/Capacitor/Elko → Capacitor, Res/Resistor → Resistor, Pot → Potentiometer, Tube/Valve/Vacuum tube → Vacuum Tube, Socket → Tube Socket, Diode, Choke, Transformer, Fuse, Switch, Jack, LED, Loudspeaker/Speaker (BA, LS, SPK)) plus the column header names. Rules are saved in the browser.

### 1. Multi-Format BOM Ingestion & Smart Mapping
- **File Formats Supported**: Microsoft Excel (`.xlsx`, `.xls`), CSV (`.csv`), TSV (`.tsv`), and plain text (`.txt`).
- **Dynamic Column Mapping**: Automatically infers column headers for **Part Number**, **Quantity**, **Designator / Reference**, and **Description** with interactive 5-row preview and custom dropdown overrides. The part number column follows the active BOM: its own supplier's part number first (`Mouser Part Number` / `Digi-Key Part Number`), then the manufacturer part number, and the other supplier's number only as a last resort, so a Mouser or DigiKey BOM upload file loads into either BOM.
- **Line-by-Line Plain Text Parsing**: Ingest unstructured paste text (e.g. `STM32F401RET6 10 U1` or comma/tab delimited).
- **1-Click Demo BOMs**: Built-in reference projects (**Smart IoT Sensor Node** and **STM32 Motor Controller**) for immediate testing.

### 2. Live Mouser Electronics API Integration
- **Search by Part Number (`POST /api/mouser/search/partnumber`)**: Resolves MPN and Mouser Part Numbers.
- **Search by Keyword (`POST /api/mouser/search/keyword`)**: Powers manual search and alternate replacement searches.
- **Rate Limiting & Concurrency Throttling**: Server-side queueing with exponential backoff on HTTP 429 errors.
- **High-Fidelity Demo / Simulation Mode**: Built-in catalog of genuine electronics components with stock levels, datasheets, and manufacturer price breaks, usable even without an active Mouser API key.
- **Secure Server-Side Proxy**: API keys are securely held on the backend or passed via secure headers—never exposed to browser clients.

### 3. Interactive BOM Grid & Dynamic Pricing Engine
- **TanStack Table (React Table v8)**: Sortable columns, search filter, and status filters.
- **Prices in USD only**: DigiKey is queried in USD; Mouser price breaks in another currency (set by the account behind the API key) are converted on the server (`src/lib/currency/usd.ts`, live daily rate from frankfurter.dev, falling back to open.er-api.com and the fawazahmed0 currency API; a price with no live rate is hidden, never shown in another currency). The Mouser cart total and BOMs saved in the browser before this rule are converted too.
- **Select and delete lines**: every row has a checkbox (plus a select-all box in the header); **Delete selected (n)** removes the ticked lines from the active BOM.
- **Dynamic Tiered Pricing**: Inline quantity adjustments automatically recalculate the matching price break tier and extended total (`Qty * Unit Price`).
- **Hover Price Break Matrix**: Interactive popover showing volume quantity discounts.
- **Packaging & MOQ Indicators**: Flags parts where requested quantity is below Minimum Order Quantity (MOQ) or does not meet reel/cut-tape package multiples.
- **Part Replacement Modal**: Search and substitute parts directly into any BOM row with automatic price and stock updates.
- **SMD / regular parts per line**: Every line has an **SMD** checkbox under its designator. Unticked (the default) searches regular through-hole parts; ticked searches surface-mount (SMD/SMT) parts. The mounting is read from DigiKey's *Mounting Type* and Mouser's category (e.g. `Thick Film Resistors - SMD`). Ticking it on a line that was already looked up searches that line again.

### 4. 1-Click Mouser Cart Creation & Export
- **Mouser Cart API (`POST /api/mouser/cart/create`)**: Pushes resolved items and quantities to create an active Mouser shopping session.
- **Cart Key (GUID) & Direct Checkout**: Displays generated Cart Key with 1-click clipboard copy and direct **"Open Cart on Mouser.com"** navigation.
- **Supplier BOM Upload Export**: **Mouser BOM Upload (.csv)** / **DigiKey BOM Upload (.csv)**, depending on the active BOM, writes the columns of the Mouser BOM Tool (`Mouser Part Number`, `Manufacturer Part Number`, `Manufacturer`, `Description`, `Customer Part Number`, `Quantity`) or the DigiKey BOM Manager (`Quantity`, `Digi-Key Part Number`, `Manufacturer Part Number`, `Manufacturer`, `Description`, `Customer Reference`, `Reference Designator`). Lines whose keyword search found nothing are left out.
- **Enriched File Export**: Download calculated results back to Microsoft Excel (`.xlsx`), `.csv`, or copy as TSV text.

### 5. Look and feel
- Dark, responsive layout that works on desktop and phones.
- The browser-tab and home-screen icon is aerocat.tech's own favicon (`src/app/icon.png`, `apple-icon.png`, `favicon.ico`).

---

## 🛠️ Architecture & Tech Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, TanStack Table, SheetJS and PapaParse; unit tests with Vitest.

```
mouser-bom-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── mouser/
│   │   │   │   ├── search/{partnumber,keyword,batch}/route.ts  # Mouser Search API proxy (rate-limited)
│   │   │   │   ├── cart/create/route.ts       # Mouser Cart API proxy
│   │   │   │   └── verify/route.ts            # API key validation
│   │   │   └── digikey/
│   │   │       ├── search/{partnumber,keyword}/route.ts  # DigiKey Product Information v4 proxy
│   │   │       └── verify/route.ts            # OAuth credential check
│   │   ├── icon.png, apple-icon.png, favicon.ico  # aerocat.tech icon
│   │   ├── globals.css                        # Tailwind CSS v4 styling
│   │   ├── layout.tsx                         # Root layout
│   │   └── page.tsx                           # Main dashboard
│   ├── components/
│   │   ├── Navbar.tsx                         # Header, version label, status
│   │   ├── SupplierSwitcher.tsx               # Mouser / DigiKey switch
│   │   ├── FileUploadZone.tsx                 # Drag-and-drop & text ingestion
│   │   ├── ColumnMappingModal.tsx             # Header mapping & preview
│   │   ├── CadKeywordImport.tsx               # Tube Amp CAD keyword import
│   │   ├── BomGrid.tsx                        # BOM table: SMD box, row selection, delete
│   │   ├── ReplacePartModal.tsx               # Find Alternate (scored, mounting-aware)
│   │   ├── ManualSearchModal.tsx              # Ad-hoc search
│   │   ├── SummaryCards.tsx                   # Cost, stock & alert metrics
│   │   ├── SettingsModal.tsx                  # API keys, DigiKey credentials, rate limits
│   │   ├── CartSuccessModal.tsx               # Mouser cart / DigiKey cart list
│   │   ├── ExportDropdown.tsx                 # Supplier BOM upload, XLSX, CSV, TSV
│   │   └── ApiKeyBanner.tsx                   # API key / demo mode notice
│   ├── lib/
│   │   ├── mouser/                            # Mouser client, price math, rate limiter, types
│   │   ├── digikey/                           # DigiKey OAuth client & normalisation to the common part shape
│   │   ├── currency/usd.ts                    # Server-side conversion to USD
│   │   ├── currency/convert.ts                # Rate math shared by server and browser
│   │   ├── voltage/voltage.ts                 # Higher-voltage capacitor fallback
│   │   ├── value/notation.ts                  # Equivalent value notations (470nF = 0.47uF, 4.7k = 4K7)
│   │   ├── mounting/mounting.ts               # SMD vs through-hole detection
│   │   ├── scoring/manufacturers.ts           # Manufacturer tiers & 0-100 part score
│   │   ├── parser/                            # BOM parser, column detector, CAD keyword parser, samples
│   │   └── export/excel-export.ts             # XLSX/CSV and supplier BOM upload CSVs
│   └── store/
│       ├── bom-store.ts                       # BOM state, lookups, fallbacks (localStorage per supplier)
│       ├── supplier-store.ts                  # Active supplier
│       └── settings-store.ts                  # Settings (localStorage)
├── deploy/nuc/                                # Auto-deploy for the aerocat.tech NUC
├── release/, scripts/package-release.mjs      # Ready-to-run release archives
├── Dockerfile, docker-compose.yml             # Server image (built for the /bom path)
└── .github/workflows/                         # CI (lint, typecheck, test, build) & release
```

---

## 🚀 Getting Started

### 1. Installation

```bash
cd mouser-bom-app
npm install
```

### 2. API keys

No keys go on the server or in environment files. Open **Settings** in the app and enter your Mouser Search API key (and optional Cart API key) from https://www.mouser.com/api-search/ and the Client ID/Secret of a DigiKey app (https://developer.digikey.com/, Product Information V4). They are saved only in your browser's `localStorage` and sent with each request to this app's server, which passes them to Mouser or DigiKey and never stores them. For the DigiKey sandbox, set `DIGIKEY_API_BASE=https://sandbox-api.digikey.com` on the server.

All prices are shown in USD. DigiKey is asked for USD directly; Mouser prices in another currency (set by the account behind the API key) are converted on the server with a live daily reference rate from frankfurter.dev, falling back to open.er-api.com and the fawazahmed0 currency API (jsDelivr, then Cloudflare Pages). If none of them answers, the last live rates are kept; if there were never any, the price is hidden rather than shown in another currency. The Mouser cart total is converted the same way, and BOMs saved in the browser with an older currency are converted when they load (`/api/currency/rates`).

The server exchanges DigiKey credentials for a short-lived OAuth token, kept only in memory. Never commit real keys.

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build

```bash
npm run build
npm run start -p 3000
```

### 5. Checks

```bash
npm run lint
npm run typecheck
npm test        # vitest: CAD keyword parser (incl. a real GUB-245-01 BOM fixture), DigiKey normalisation,
                # USD conversion, voltage fallback, value notations, mounting, scoring, supplier upload export
```

---

## 📖 User Workflow

0. **Pick a supplier**: choose Mouser or DigiKey at the top. Each has its own BOM.
1. **Upload BOM**: Drag and drop an `.xlsx`, `.csv`, or `.txt` file, or click **"IoT Sensor Node"** to load a sample.
2. **Review Header Mapping**: The modal auto-detects Part Number, Quantity, and Designators. Confirm and click **"Import & Query Mouser"**.
3. **Inspect Real-Time Pricing & Stock**:
   - Status indicators highlight in-stock parts (Green), low-stock parts (Yellow), and MOQ warnings (Orange).
   - Adjust quantities directly in the **Req Qty** input to watch unit price update dynamically based on manufacturer price tiers.
   - Tick **SMD** on a line to search surface-mount parts for it; tick row checkboxes and click **Delete selected** to drop lines.
4. **Replace / Search Alternates**: Click the refresh icon on any row to open **Find Alternate**: it lists in-stock parts with the line's mounting, sorted by score, to substitute in one click.
5. **Send to the supplier**: on Mouser, **Export to Mouser Cart** pushes parts to the Mouser Cart API (copy the Cart Key or **Open Cart on Mouser.com**). On DigiKey, **Copy DigiKey Cart List** copies lines to paste into the DigiKey cart. Either supplier's **BOM Upload (.csv)** can be loaded into its BOM tool.
6. **Tube amp CAD BOM**: on the **Tube Amp CAD (keywords)** tab, click **Load file** (or paste), check the preview of categories, quantities and search queries, then **Import & search** on the selected supplier.
7. **Download Enriched BOM**: Click **"Download Enriched BOM"** to save the fully calculated BOM as an Excel `.xlsx` or `.csv`, or copy it as TSV.
