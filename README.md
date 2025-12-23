# 💰 Moneyo — Finanzas Personales con IA
Moneyo es una aplicación de contabilidad doméstica moderna, minimalista y segura. Diseñada para ofrecer una experiencia visual excepcional mientras mantiene un control riguroso de tus cuentas, transacciones y presupuestos, todo potenciado por inteligencia artificial para la digitalización de recibos.
## ✨ Características Principales
-   **Dashboard Visual**: Resumen detallado de balance total, ingresos y gastos con gráficos interactivos.
-   **Gestión de Cuentas**: Control de efectivo, cuentas bancarias y tarjetas de crédito.
-   **IA Moneyo**: Digitalización de tickets y facturas mediante Gemini AI (Google).
-   **Presupuestos Inteligentes**: Control de límites de gasto mensual por categorías.
-   **Transacciones Recurrentes**: Automatización de movimientos fijos (alquiler, suscripciones, etc.).
-   **Reportes Avanzados**: Exportación de datos a CSV y generación de informes financieros en PDF.
-   **Multi-idioma y Multi-moneda**: Soporte completo para diferentes divisas y localización.
-   **Seguridad y Privacidad**: Ejecución sobre Cloudflare Workers con persistencia en Durable Objects.
---
## 📱 Instalación Local
Sigue estos pasos para ejecutar tu propia instancia de Moneyo en tu ordenador para desarrollo o uso personal.
### 1. Prerrequisitos
Asegúrate de tener instalado lo siguiente:
-   **Node.js** (v18 o superior).
-   **Bun** (Recomendado): Instalador rápido de paquetes. `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) o `curl -fsSL https://bun.sh/install | bash` (macOS/Linux).
-   **Wrangler CLI**: La herramienta de Cloudflare para ejecutar Workers.
    ```bash
    npm install -g wrangler
    ```
### 2. Clonar el Proyecto
Clona tu fork o el repositorio original:
```bash
git clone https://github.com/TU_USUARIO/moneyo.git
cd moneyo
```
### 3. Instalación de Dependencias
Usa Bun para instalar todos los paquetes necesarios de forma rápida:
```bash
bun install
```
### 4. Configuración de IA (Opcional)
Si deseas usar la función de escaneo de recibos, edita el archivo `public/config/gemini.json` con tu propia API Key de Google Gemini:
```json
{
  "claveApi": "TU_API_KEY_AQUÍ",
  "modeloIa": "gemini-1.5-flash",
  "instruccionesIa": "extrae los datos del ticket"
}
```
### 5. Ejecución en Desarrollo
Inicia el servidor local simulando el entorno de Cloudflare:
```bash
wrangler dev
```
### 6. Acceso
Una vez iniciado, abre tu navegador en:
**[http://localhost:3000](http://localhost:3000)**
---
## 🔄 Actualización y Mantenimiento
Para mantener tu instancia de Moneyo al día con las últimas mejoras del repositorio original, sigue este flujo:
1.  **Vincular el repositorio original** (solo la primera vez):
    ```bash
    git remote add upstream https://github.com/chdeimos/moneyo.git
    ```
2.  **Sincronizar cambios**:
    ```bash
    git pull upstream main
    bun install
    wrangler dev
    ```
---
## 💾 Base de Datos Local (Durable Objects)
Moneyo utiliza **Cloudflare Durable Objects** para el almacenamiento. En el entorno local, los datos se guardan en una carpeta oculta:
-   **Ubicación**: `.wrangler/state/v3/durable_objects`
-   **Resetear Datos**: Si deseas borrar toda la información local y empezar de cero (limpiar la base de datos), simplemente cierra el proceso de `wrangler dev` y elimina la carpeta `.wrangler`:
    ```bash
    rm -rf .wrangler
    ```
---
## 🚀 Despliegue en Producción
Para publicar tu aplicación en tu propia cuenta de Cloudflare de forma gratuita:
1.  Inicia sesión en Cloudflare: `wrangler login`.
2.  Despliega la aplicación:
    ```bash
    bun run deploy
    ```
---
## 🛠️ Tecnologías Utilizadas
-   **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
-   **Backend**: Hono (Worker), Cloudflare Durable Objects.
-   **IA**: Google Gemini API.
-   **Gráficos**: Recharts.
-   **PDF**: jsPDF.
---
Desarrollado con ❤️ por **chdeimos** (2025).