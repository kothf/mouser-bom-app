BOM Studio - Mouser & DigiKey BOM search
========================================

Requirements: Node.js 20 or newer (https://nodejs.org/). Nothing else to install.

Start
  Windows:       double-click start.cmd
  Linux / macOS: ./start.sh

The app opens at http://localhost:3000 (set PORT to change it).

API keys
  Open Settings (gear icon) and enter:
  - Mouser: your Mouser Search API key (https://www.mouser.com/api-search/)
  - DigiKey: Client ID and Client Secret of your own app on https://developer.digikey.com/
    with the "Product Information V4" API enabled.
  Keys are stored in your browser only and sent to this local server.

  Alternatively set them as environment variables before starting:
    MOUSER_SEARCH_API_KEY, MOUSER_CART_API_KEY, DIGIKEY_CLIENT_ID, DIGIKEY_CLIENT_SECRET
  (Linux/macOS: put "export NAME=value" lines in bom-studio.env next to start.sh;
   Windows: put "set NAME=value" lines in bom-studio.env.cmd next to start.cmd)

Saved BOMs are written to the data/ folder next to server.js.
