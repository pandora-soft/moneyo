# Moneyo — Contabilidad doméstica bonita y segura 💰
**Moneyo** es una aplicación de finanzas personales minimalista, rápida y segura, diseñada para funcionar en el ecosistema de **Cloudflare Workers** con persistencia en **Durable Objects**. Permite gestionar cuentas, transacciones, presupuestos e incluso digitalizar recibos mediante Inteligencia Artificial (Gemini).
## 🚀 Guía: Actualizar desde GitHub
Si has desplegado Moneyo y quieres mantener tu instancia actualizada con las últimas mejoras del repositorio original, sigue estos pasos:
### 1. Exportar a GitHub
Desde el entorno de previsualización o desarrollo donde estés visualizando este proyecto, utiliza el botón de **Export to GitHub** (ubicado habitualmente en la esquina superior derecha). Esto creará un repositorio en tu cuenta con todo el código fuente.
### 2. Crear un Fork
Si ya tienes el repositorio en tu cuenta de GitHub pero quieres trabajar de forma organizada, asegúrate de tener un **Fork** personal. Esto te permitirá recibir actualizaciones del "upstream" (el repositorio original) sin perder tus cambios locales.
### 3. Sincronizar Cambios (Upstream Sync)
Para traer las nuevas funcionalidades o correcciones del autor original a tu copia:
1. Configura el repositorio original como remoto: `git remote add upstream [URL_DEL_REPO_ORIGINAL]`
2. Trae los cambios: `git fetch upstream`
3. Fusiona los cambios en tu rama principal: `git merge upstream/main`
### 4. Editar Archivos
Puedes realizar cambios rápidos directamente en la interfaz de GitHub (botón `.` o editar archivo) o clonar el repo en tu máquina local. Los archivos más importantes para configurar son:
- `wrangler.jsonc`: Configuración de despliegue en Cloudflare.
- `package.json`: Versiones de dependencias y scripts de construcción.
- `public/config/gemini.json`: Configuración global de la IA.
### 5. Desplegar en Cloudflare Workers
Moneyo está optimizado para Cloudflare. Una vez que tengas tu código listo en tu fork o local:
1. Instala las dependencias: `bun install`
2. Construye la aplicación: `bun run build` (ejecuta `vite build`)
3. Despliega en tu cuenta de Cloudflare: `bun run deploy` (ejecuta `wrangler deploy`)
---
## 🛠️ Tecnologías Principales
- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend**: Hono (ejecutándose en Cloudflare Workers).
- **Almacenamiento**: Cloudflare Durable Objects (vía `core-utils.ts`).
- **IA**: Google Gemini AI para análisis de recibos.
- **Gráficos**: Recharts.
## 📦 Scripts Disponibles
- `bun run dev`: Inicia el servidor de desarrollo local (Vite).
- `bun run build`: Compila el frontend para producción.
- `bun run deploy`: Construye el proyecto y lo publica en Cloudflare Workers.
- `bun run lint`: Ejecuta el análisis estático de código.
---
## 🔒 Seguridad y Privacidad
Moneyo no almacena tus datos en servidores de terceros. Todo reside en **tu propia infraestructura de Cloudflare**, dándote control total sobre tu información financiera.
---
*Desarrollado con ❤️ para una gestión financiera más inteligente.*