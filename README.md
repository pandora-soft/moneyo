# CasaConta

[cloudflarebutton]

## Overview

CasaConta is a minimalist and polished web application designed for household accounting. It enables users to track accounts (such as cash, debit, and credit), record transactions (expenses, income, and transfers), manage simple budgets, and generate monthly reports. Built with a focus on visual excellence, it features clean typography, ample margins, smooth micro-interactions, and elegant loading states. The app leverages Cloudflare Workers and Durable Objects for secure, performant backend storage and operations.

This project follows a phased development approach: starting with a stunning frontend foundation and basic CRUD operations, then advancing to financial features like transfers, recurring transactions, budgets, and export capabilities (CSV/PDF).

## Key Features

- **Account Management**: Create, edit, and delete accounts with real-time balance tracking.
- **Transaction Handling**: Log expenses, incomes, and transfers with categorization, date filtering, and search.
- **Budget Tools**: Simple monthly budgets to monitor spending against limits.
- **Reporting**: Visual monthly summaries, balance history, and category breakdowns (with charts via Recharts).
- **User-Friendly Interface**: Responsive design, intuitive navigation, and delightful interactions using Shadcn UI and Tailwind CSS.
- **Secure Persistence**: Backend powered by Cloudflare Durable Objects for reliable, atomic data operations.
- **Export Support**: CSV import/export and report generation (phased implementation).
- **Settings**: Customizable currency, fiscal month start, and theme preferences.

The app ensures a seamless experience across devices, with mobile-first responsive layouts and accessibility best practices.

## Technology Stack

- **Frontend**: React 18, TypeScript, React Router, Shadcn UI, Tailwind CSS 3, Framer Motion (micro-interactions), Recharts (charts), Date-fns (date utilities), Zustand (state management), Sonner (toasts).
- **Backend**: Cloudflare Workers, Hono (routing), Durable Objects (via custom Entity wrappers for persistence).
- **Build Tools**: Vite (bundler), Bun (package manager), Wrangler (deployment).
- **Utilities**: Lucide React (icons), Zod (validation), Immer (immutable updates), clsx/tailwind-merge (styling helpers).
- **Shared**: Type-safe API responses and data models in TypeScript.

No external APIs or additional servers required—all data is stored client-side via the single GlobalDurableObject binding.

## Installation

Prerequisites:
- [Bun](https://bun.sh/) installed (version 1.0+ recommended).
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for deployment (optional for local dev).

1. Clone the repository:
   ```
   git clone <repository-url>
   cd casaconta
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

API endpoints are accessible at `/api/finance/*` (e.g., `GET /api/finance/accounts` for listing accounts). Mock data seeds on first load for demo purposes.

Example API call from frontend (using the provided `api` helper):
```typescript
import { api } from '@/lib/api-client';

const accounts = await api<{ items: Account[]; next: string | null }>('/api/finance/accounts');
```

## Development

### Project Structure

- **src/**: React frontend (pages, components, hooks, lib).
- **worker/**: Hono-based backend routes and entities (do not modify `core-utils.ts` or `index.ts`).
- **shared/**: TypeScript types and mock data (extend for app-specific models).
- **Root**: Config files (Tailwind, Vite, TypeScript, Wrangler).

### Adding Features

1. **Frontend Pages**: Add routes in `src/main.tsx` using React Router. Use `AppLayout` for consistent structure.
2. **API Routes**: Implement in `worker/user-routes.ts` using Entity classes from `worker/entities.ts` (e.g., extend `IndexedEntity` for new models like `AccountEntity`).
3. **Entities**: Define in `worker/entities.ts` with static `indexName`, `initialState`, and methods (e.g., `createTransaction`).
4. **State Management**: Use Zustand stores with primitive selectors to avoid re-render loops.
5. **Styling**: Leverage Shadcn UI components (import from `@/components/ui/*`) and Tailwind utilities. Ensure responsive wrappers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` with section padding `py-8 md:py-10 lg:py-12`.
6. **Validation**: Use React Hook Form + Zod for forms.
7. **Linting/Type Checking**: Run `bun run lint` or `tsc --noEmit`.

Follow UI non-negotiables: mobile-first, high contrast, smooth transitions. Test for infinite loops (e.g., no setState in render).

### Testing

- Local API: Use browser dev tools or tools like Postman to hit `/api/*`.
- End-to-End: Manually test CRUD flows; the template includes error boundaries.
- Seeding: Entities auto-seed mock data via `ensureSeed` on first request.

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

   This builds the frontend (Vite) and deploys the Worker bundle. The app will be live at your Workers subdomain (e.g., `casaconta-fqyoxziaw_plrx7p6fcfh.your-account.workers.dev`).

3. For custom domains: Update `wrangler.jsonc` (name and assets) and run `wrangler deploy` again.

[cloudflarebutton]

**Notes**:
- Assets (static files) are served via Workers Sites integration.
- Durable Objects provide stateful storage without additional config.
- Monitor logs via `wrangler tail` and metrics in the Cloudflare dashboard.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Follow the phased roadmap in the blueprint for contributions. Ensure no breaking changes to core utilities.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.