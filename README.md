# Mouser BOM Studio 🚀

A responsive, production-ready Full-Stack Web Application for electronic engineers and procurement specialists to search components, process uploaded Bills of Materials (BOM), display real-time pricing and stock, and generate Mouser shopping carts via the **Mouser Electronics REST API (Search API & Cart API)**.

---

## ⬇️ Download & Run (no build needed)

Ready-to-run builds for Windows, macOS and Linux are attached to every [GitHub release](../../releases/latest).
Install [Node.js 20+](https://nodejs.org/), unpack the archive for your system, and run `start.cmd` (Windows) or `./start.sh` (Linux/macOS). The app opens at http://localhost:3000.

Releases are built by `.github/workflows/release.yml`: every merge to `main` whose `package.json` version has no release yet publishes `v<version>` automatically (pushing a `v*` tag or running the workflow manually works too). Bump the version to ship a new release.

---

## ⚡ Key Features

### 0. Mouser and DigiKey, kept apart
- A **supplier switcher** at the top selects Mouser or DigiKey. Each supplier has its **own BOM**, own storage (`data/saved-bom.json` vs `data/saved-bom-digikey.json`) and own cart flow, so results are never mixed in one BOM.
- **DigiKey Product Information API v4**: part-number lookup (product details, falling back to exact keyword matches) and keyword search, with OAuth2 client-credentials tokens cached on the server and a rate limiter tuned for DigiKey's 120 requests/minute.
- **DigiKey cart**: DigiKey has no public cart API comparable to Mouser's, so **Copy DigiKey Cart List** copies `Quantity, DigiKey Part Number, Customer Reference` lines and opens the DigiKey cart for pasting.

### 0b. Tube Amp CAD import by keywords
- The **Tube Amp CAD (Keywords)** tab reads BOM exports that list components by type and value instead of part numbers, e.g. `C1, Cap, 22uF, 450V, electrolytic`, `R1-R4 Res 100k 1W`, `V1 Tube 12AX7`.
- Works with CSV, TSV, semicolon-separated, plain text and Excel exports, with or without a header row (`Ref`, `Type`, `Value`, `Voltage`, `Power`, `Qty`, `Description`).
- Recognises capacitance (`22uF`, `4n7`, `0.1µF`), resistance (`100k`, `4k7`, `470R`, `1M5`), inductance (`5H`), voltage (`450V`), power (`1W`, `1/2W`), tolerance, designator ranges (`R1-R4`) and quantity markers (`x4`, `qty 2`).
- Identical components are merged and quantities summed. Each line becomes a keyword search on the selected supplier, and the best in-stock match is picked (shown with a "Keyword" tag so it can be reviewed or replaced).
- **Keywords are configurable** under *Edit keywords*: `Category: keyword, keyword | designator prefixes` (defaults: Cap/Capacitor/Elko → Capacitor, Res/Resistor → Resistor, Pot → Potentiometer, Tube/Valve → Vacuum Tube, Diode, Choke, Transformer, Socket, Fuse, Switch, Jack, LED) plus the column header names. Rules are saved in the browser.

### 1. Multi-Format BOM Ingestion & Smart Mapping
- **File Formats Supported**: Microsoft Excel (`.xlsx`, `.xls`), CSV (`.csv`), TSV (`.tsv`), and plain text (`.txt`).
- **Dynamic Column Mapping**: Automatically infers column headers for **Part Number**, **Quantity**, **Designator / Reference**, and **Description** with interactive 5-row preview and custom dropdown overrides.
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
- **Dynamic Tiered Pricing**: Inline quantity adjustments automatically recalculate the matching price break tier and extended total (`Qty * Unit Price`).
- **Hover Price Break Matrix**: Interactive popover showing volume quantity discounts.
- **Packaging & MOQ Indicators**: Flags parts where requested quantity is below Minimum Order Quantity (MOQ) or does not meet reel/cut-tape package multiples.
- **Part Replacement Modal**: Search and substitute parts directly into any BOM row with automatic price and stock updates.

### 4. 1-Click Mouser Cart Creation & Export
- **Mouser Cart API (`POST /api/mouser/cart/create`)**: Pushes resolved items and quantities to create an active Mouser shopping session.
- **Cart Key (GUID) & Direct Checkout**: Displays generated Cart Key with 1-click clipboard copy and direct **"Open Cart on Mouser.com"** navigation.
- **Enriched File Export**: Download calculated results back to Microsoft Excel (`.xlsx`), `.csv`, or copy as TSV text.

---

## 🛠️ Architecture & Tech Stack

```
mouser-bom-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── mouser/
│   │   │       ├── search/
│   │   │       │   ├── partnumber/route.ts  # Part Number Search Proxy
│   │   │       │   ├── keyword/route.ts     # Keyword Search Proxy
│   │   │       │   └── batch/route.ts       # Rate-limited Batch Search Proxy
│   │   │       ├── cart/
│   │   │       │   └── create/route.ts      # Mouser Cart API Proxy
│   │   │       └── verify/route.ts          # API Key Live Validation
│   │   ├── globals.css                      # Tailwind CSS v4 styling
│   │   ├── layout.tsx                       # Dark-themed root layout
│   │   └── page.tsx                         # Main Dashboard
│   ├── components/
│   │   ├── Navbar.tsx                       # Header & status bar
│   │   ├── ApiKeyBanner.tsx                 # API key notice / Demo mode banner
│   │   ├── SummaryCards.tsx                 # Cost, stock fulfillment & alert metrics
│   │   ├── FileUploadZone.tsx               # Drag-and-drop & text ingestion
│   │   ├── ColumnMappingModal.tsx           # Dynamic header mapping & preview
│   │   ├── BomGrid.tsx                      # TanStack Table with inline editing
│   │   ├── ManualSearchModal.tsx            # Ad-hoc Mouser search modal
│   │   ├── ReplacePartModal.tsx             # Part alternate replacement modal
│   │   ├── SettingsModal.tsx                # API keys & rate limit configuration
│   │   ├── CartSuccessModal.tsx             # Mouser Cart checkout dialog
│   │   └── ExportDropdown.tsx               # Excel (.xlsx) / CSV exporter
│   ├── lib/
│   │   ├── mouser/
│   │   │   ├── client.ts                    # Mouser REST API Client & price math
│   │   │   ├── rate-limiter.ts              # Concurrency queue & backoff logic
│   │   │   └── types.ts                     # TypeScript interfaces
│   │   ├── parser/
│   │   │   ├── bom-parser.ts                # XLSX / CSV / TXT parser
│   │   │   ├── column-detector.ts           # Header detection heuristics
│   │   │   └── sample-boms.ts               # Demo datasets
│   │   └── export/
│   │       └── excel-export.ts              # SheetJS XLSX/CSV generator
│   └── store/
│       ├── bom-store.ts                     # Zustand BOM state & calculations
│       └── settings-store.ts                # Settings & LocalStorage persistence
```

---

## 🚀 Getting Started

### 1. Installation

```bash
cd mouser-bom-app
npm install
```

### 2. Environment Configuration

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to provide your Mouser API keys:

```env
# Get keys at: https://www.mouser.com/api-search/
MOUSER_SEARCH_API_KEY=your_search_api_key_here
MOUSER_CART_API_KEY=your_cart_api_key_here

# Optional: set to true to force offline demo simulation mode
NEXT_PUBLIC_DEMO_MODE=false

# Optional: DigiKey app credentials (https://developer.digikey.com/, Product Information V4)
DIGIKEY_CLIENT_ID=your_client_id
DIGIKEY_CLIENT_SECRET=your_client_secret
# Optional: locale and sandbox
# DIGIKEY_LOCALE_SITE=US
# DIGIKEY_LOCALE_CURRENCY=USD
# DIGIKEY_API_BASE=https://sandbox-api.digikey.com
```

DigiKey credentials can also be entered per browser in **Settings**; they are stored in `localStorage` and only sent to this app's own server, which exchanges them for an OAuth token. Never commit real keys.

*(Note: API keys can also be configured dynamically in the browser via the **Settings** modal, stored securely in `localStorage`).*

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
npm test        # vitest unit tests (CAD keyword parser, DigiKey normalisation)
```

---

## 📖 User Workflow

1. **Upload BOM**: Drag and drop an `.xlsx`, `.csv`, or `.txt` file, or click **"IoT Sensor Node"** to load a sample.
2. **Review Header Mapping**: The modal auto-detects Part Number, Quantity, and Designators. Confirm and click **"Import & Query Mouser"**.
3. **Inspect Real-Time Pricing & Stock**:
   - Status indicators highlight in-stock parts (Green), low-stock parts (Yellow), and MOQ warnings (Orange).
   - Adjust quantities directly in the **Req Qty** input to watch unit price update dynamically based on manufacturer price tiers.
4. **Replace / Search Alternates**: Click the refresh icon on any row to search for pin-compatible alternatives and substitute them in one click.
5. **Export to Mouser Cart**: Click **"Export to Mouser Cart"** to push parts to the Mouser Cart API. Copy the Cart Key or click **"Open Cart on Mouser.com"** to complete checkout.
6. **Download Enriched BOM**: Click **"Download Enriched BOM"** to save the fully calculated BOM as an Excel `.xlsx` or `.csv`.
