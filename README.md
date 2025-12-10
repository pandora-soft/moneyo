# Moneyo
[cloudflarebutton]
## Overview
Moneyo is a minimalist and polished web application designed for household accounting. It enables users to track accounts (such as cash, debit, and credit), record transactions (expenses, income, and transfers), manage simple budgets, and generate monthly reports. Built with a focus on visual excellence, it features clean typography, ample margins, smooth micro-interactions, and elegant loading states. The app leverages Cloudflare Workers and Durable Objects for secure, performant backend storage and operations.
This project follows a phased development approach: starting with a stunning frontend foundation and basic CRUD operations, then advancing to financial features like transfers, recurring transactions, budgets, and export capabilities (CSV/PDF). App rebranded to Moneyo per client request.
## Key Features
- **Account Management**: Create, edit, and delete accounts with real-time balance tracking.
- **Transaction Handling**: Log expenses, incomes, and transfers with categorization, date filtering, and search.
- **Recurring Transactions**: Define transaction templates that automatically generate on a schedule (e.g., monthly rent).
- **Budget Tools**: Simple monthly budgets to monitor spending against limits, with visual progress bars.
- **Reporting**: Visual monthly summaries, balance history, and category breakdowns with charts via Recharts.
- **Data Import/Export**: Full support for CSV import of transactions and export of transactions, budgets, and PDF reports.
- **User-Friendly Interface**: Responsive design, intuitive navigation, and delightful interactions using Shadcn UI and Tailwind CSS.
- **Secure Persistence**: Backend powered by Cloudflare Durable Objects for reliable, atomic data operations.
- **Settings**: Customizable currency, fiscal month start, theme preferences, and management of categories and recurring frequencies.
The app ensures a seamless experience across devices, with mobile-first responsive layouts and accessibility best practices.
## Technology Stack
- **Frontend**: React 18, TypeScript, React Router, Shadcn UI, Tailwind CSS 3, Framer Motion (micro-interactions), Recharts (charts), Date-fns (date utilities), Zustand (state management), Sonner (toasts).
- **Backend**: Cloudflare Workers, Hono (routing), Durable Objects (via custom Entity wrappers for persistence).
- **Build Tools**: Vite (bundler), Bun (package manager), Wrangler (deployment).
- **Utilities**: Lucide React (icons), Zod (validation), Immer (immutable updates), clsx/tailwind-merge (styling helpers), jsPDF (PDF generation).
- **Shared**: Type-safe API responses and data models in TypeScript.
No external APIs or additional servers required—all data is stored client-side via the single GlobalDurableObject binding.
## Installation
Prerequisites:
- [Bun](https://bun.sh/) installed (version 1.0+ recommended).
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for deployment (optional for local dev).
1. Clone the repository:
   ```
   git clone <repository-url>
   cd moneyo
   ```
2. Install dependencies using Bun:
   ```
   bun install
   ```
3. (Optional) Generate TypeScript types from Worker bindings:
   ```
   bun run cf-typegen
   ```
The project is pre-configured—no additional setup needed for Shadcn UI components or Tailwind.
## Usage
### Running Locally
Start the development server:
```
bun run dev
```
The app will be available at `http://localhost:3000` (or the port specified in your environment). It includes hot-reloading for frontend changes and proxies API calls to the Worker.
### Basic Interactions
- **Dashboard (Home)**: View total balance, recent transactions, and quick actions like "Add Transaction".
- **Accounts**: List and manage accounts (e.g., create a new "Cash" account).
- **Transactions**: Filter by date, account, or type; add/edit via intuitive forms in modals.
- **Reports**: Generate monthly overviews with bar charts for categories.
- **Settings**: Adjust currency (e.g., USD, EUR) and theme (light/dark).
Example API call from frontend (using the provided `api` helper):
```typescript
import { api } from '@/lib/api-client';
const accounts = await api<Account[]>('/api/finance/accounts');
```
## API Endpoints
All endpoints are prefixed with `/api/finance`.
- `GET /accounts`: List all accounts.
- `POST /accounts`: Create a new account. Payload: `{ name, type, currency, balance }`.
- `PUT /accounts/:id`: Update an account. Payload: `{ name, type, currency }`.
- `DELETE /accounts/:id`: Delete an account.
- `GET /transactions`: List transactions (paginated with `?limit=` and `?cursor=`).
- `POST /transactions`: Create a transaction. Payload: `{ accountId, type, amount, category, ts, ... }`.
- `PUT /transactions/:id`: Update a transaction. Payload: `Partial<Transaction>`.
- `DELETE /transactions/:id`: Delete a transaction.
- `POST /transactions/import`: Import transactions from a CSV file.
- `POST /transactions/generate`: Trigger generation of recurrent transactions.
- `GET /budgets`: List all budgets.
- `POST /budgets`: Create a budget. Payload: `{ month, category, limit }`.
- `PUT /budgets/:id`: Update a budget.
- `DELETE /budgets/:id`: Delete a budget.
- `GET /categories`, `POST`, `PUT /:id`, `DELETE /:id`: CRUD for categories.
- `GET /currencies`, `POST`, `PUT /:id`, `DELETE /:id`: CRUD for currencies.
- `GET /frequencies`, `POST`, `PUT /:id`, `DELETE /:id`: CRUD for recurring frequencies.
- `GET /settings`, `POST /settings`: Get or update global settings.
## Troubleshooting
- **Theme or Currency Not Updating**: The app uses `localStorage` to persist theme and currency settings. If you encounter issues, try clearing your browser's local storage for the site.
- **Browser Compatibility**: The app is tested on modern versions of Chrome, Firefox, and Safari. Older browsers may have rendering issues.
- **Build Errors**: Ensure all dependencies are installed with `bun install`. If TypeScript errors persist, run `bun run cf-typegen` to update worker types.
## Deployment
Deploy to Cloudflare Workers for global edge runtime:
1. Login to Cloudflare:
   ```
   wrangler login
   ```
2. Publish the project:
   ```
   bun run deploy
   ```
   This builds the frontend (Vite) and deploys the Worker bundle. The app will be live at your Workers subdomain (e.g., `moneyo-fqyoxziaw_plrx7p6fcfh.your-account.workers.dev`).
3. **Monitoring**: Use `wrangler tail` to view live logs from your deployed worker. Check the Cloudflare dashboard for analytics and error reports.
4. **Custom Domains**: To use a custom domain, add it to your Cloudflare account and update `wrangler.jsonc` with the appropriate routes before deploying.
[cloudflarebutton]
## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.
Follow the phased roadmap in the blueprint for contributions. Ensure no breaking changes to core utilities.
## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.