# Moneyo — Contabilidad doméstica bonita y segura
Moneyo es una aplicación minimalista y pulida para llevar el control de tus finanzas domésticas de manera eficiente y privada. Construida sobre tecnología de punta con Cloudflare Workers y Durable Objects, garantiza una experiencia rápida y segura.
## Características Principales
- **Gestión de Cuentas:** Controla tus balances en efectivo, cuentas bancarias y tarjetas de crédito.
- **Historial de Transacciones:** Registra ingresos, gastos y transferencias con facilidad.
- **IA Moneyo:** Digitaliza tus recibos y tickets al instante utilizando inteligencia artificial (Gemini AI).
- **Presupuestos:** Define límites de gasto por categorías y haz un seguimiento de tu progreso mensual.
- **Reportes Visuales:** Visualiza tus patrones de gasto con gráficos interactivos y exporta tus datos en PDF o CSV.
- **Multi-usuario:** Sistema de roles (Admin/User) para una gestión compartida pero controlada.
## Tecnologías Utilizadas
- **Frontend:** React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Recharts.
- **Backend:** Hono, Cloudflare Workers.
- **Persistencia:** Durable Objects con persistencia indexada.
- **Estado Global:** Zustand con persistencia local.
## Instalación y Desarrollo
1. Clona el repositorio.
2. Instala las dependencias con `bun install`.
3. Inicia el servidor de desarrollo con `bun run dev`.
4. Accede a `http://localhost:3000`.
## Configuración de IA
Para habilitar las funciones de escaneo con IA, configura tu Clave API de Gemini en la sección de **Ajustes** de la aplicación o a través del archivo de configuración global.
---
Moneyo es una herramienta de producción lista para ayudarte a tomar el control total de tu vida financiera.