# 💰 Moneyo — Finanzas Personales Inteligentes
Moneyo es una aplicación de contabilidad doméstica minimalista, bonita y segura, diseñada para correr en el borde (Edge) utilizando **Cloudflare Workers** y **Durable Objects**. Permite gestionar cuentas, transacciones, presupuestos y digitalizar recibos mediante IA (Gemini).
![Moneyo Dashboard](https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1200&auto=format&fit=crop)
---
## 📱 Instalación Local
Esta guía te permitirá tener Moneyo funcionando en tu propia computadora en menos de 5 minutos.
### Prerrequisitos Técnicos
Antes de empezar, asegúrate de tener instaladas las siguientes herramientas:
1.  **Bun v1.2+**: El motor de ejecución y gestor de paquetes ultra rápido.
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```
2.  **Wrangler**: La herramienta de línea de comandos de Cloudflare.
    ```bash
    npm i -g wrangler
    ```
3.  **Git**: Para clonar el código.
---
### Guía de 5 Pasos para el Despliegue
#### 1. Clonar el Repositorio
Descarga el código fuente a tu máquina local:
```bash
git clone https://github.com/tu-usuario/moneyo.git
cd moneyo
```
#### 2. Instalar Dependencias
Utiliza Bun para una instalación instantánea de todos los módulos necesarios:
```bash
bun install
```
#### 3. Configurar la IA (Opcional)
Moneyo utiliza Gemini de Google para escanear recibos. Puedes configurar tu API Key globalmente:
- Edita el archivo `public/config/gemini.json`.
- Si no tienes una clave, la aplicación funcionará en **Modo Demo (Mock)** devolviendo datos aleatorios para que puedas probar la interfaz.
#### 4. Iniciar el Entorno de Desarrollo
Moneyo utiliza una arquitectura híbrida. Ejecuta el siguiente comando para iniciar el servidor de Cloudflare (Worker + Durable Object) y el frontend de Vite:
```bash
wrangler dev
```
*   **Worker (Backend):** Se ejecutará normalmente en el puerto `8787`.
*   **App (Frontend):** Estará disponible en el puerto `3000`.
#### 5. Acceso y Credenciales
Abre tu navegador en [http://localhost:3000](http://localhost:3000).
Las credenciales de administrador por defecto son:
- **Usuario:** `admin`
- **Contraseña:** `admin`
*(Recuerda cambiar la contraseña en Ajustes > Gestión de Usuarios una vez dentro).*
---
## 🗄️ Gestión de Datos y Persistencia
### ¿Dónde se guardan mis datos?
Cuando ejecutas `wrangler dev`, Cloudflare crea una base de datos local basada en SQLite para emular los **Durable Objects**. Los datos se guardan en la carpeta oculta:
`./.wrangler/state/v3/durable_objects`
### ¿Cómo reiniciar la base de datos (Reset)?
Si deseas borrar todos los datos y empezar de cero (volver al estado de semilla inicial):
1. Detén el proceso de `wrangler dev` (Ctrl+C).
2. Borra la carpeta de estado: `rm -rf .wrangler`.
3. Vuelve a ejecutar `wrangler dev`.
---
## 🔄 Actualización Continua
Para mantener tu instancia de Moneyo al día con las últimas mejoras del repositorio original:
1. Configura el repositorio original como remoto:
   ```bash
   git remote add upstream https://github.com/tu-usuario-original/moneyo.git
   ```
2. Descarga y fusiona los cambios:
   ```bash
   git pull upstream main
   ```
3. Reinstala dependencias y reinicia:
   ```bash
   bun install
   wrangler dev
   ```
---
## 💡 Tips para Desarrolladores
-   **Tipado de Cloudflare:** Si añades nuevas variables de entorno o bindings, ejecuta `wrangler types` para actualizar las definiciones de TypeScript.
-   **Frontend Solo:** Si solo quieres trabajar en el diseño visual sin tocar el Worker, puedes usar `bun run dev`, pero recuerda que las llamadas a la API fallarán si el Worker no está corriendo en paralelo.
-   **Logs de Errores:** Revisa la consola donde ejecutas `wrangler dev` para ver logs en tiempo real de las transacciones financieras y la base de datos.
---
## 🛠️ Resolución de Problemas Comunes (Troubleshooting)
| Problema | Solución |
| :--- | :--- |
| **Error: Port 3000 already in use** | Otra aplicación usa el puerto. Cierra procesos o cambia el puerto en `package.json`. |
| **No se guardan los cambios** | Asegúrate de tener permisos de escritura en la carpeta del proyecto. |
| **Error de Autenticación de Wrangler** | Ejecuta `wrangler login` para vincular tu cuenta de Cloudflare (aunque sea para desarrollo local). |
| **Bun no encontrado** | Reinicia tu terminal después de la instalación de Bun para que se actualice el PATH. |
---
## 🎨 Capturas de Pantalla
![Moneyo Accounts](https://images.unsplash.com/photo-1579621909532-2d671ff2c98b?q=80&w=1200&auto=format&fit=crop)
*Vista de gestión de múltiples cuentas con saldos en tiempo real.*
---
**Moneyo** — Desarrollado con ❤️ para una contabilidad doméstica impecable.