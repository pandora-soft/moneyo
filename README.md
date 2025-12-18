# Moneyo
[cloudflarebutton]
## Resumen
Moneyo es una aplicación web minimalista y pulida diseñada para la contabilidad doméstica. Permite a los usuarios rastrear cuentas (como efectivo, débito y crédito), registrar transacciones (gastos, ingresos y transferencias), gestionar presupuestos simples y generar informes mensuales. Construida con un enfoque en la excelencia visual, cuenta con tipografía limpia, amplios márgenes, micro-interacciones suaves y estados de carga elegantes. La aplicación utiliza Cloudflare Workers y Durable Objects para almacenamiento y operaciones backend seguras y de alto rendimiento.
Este proyecto sigue un enfoque de desarrollo por fases: comenzando con una base frontend impresionante y operaciones CRUD básicas, luego avanzando a funciones financieras como transferencias, transacciones recurrentes, presupuestos y capacidades de exportación (CSV/PDF). La aplicación fue renombrada a Moneyo por solicitud del cliente.

## Características Principales
- **Gestión de Cuentas**: Crear, editar y eliminar cuentas con seguimiento de saldo en tiempo real.
- **Gestión de Transacciones**: Registrar gastos, ingresos y transferencias con categorización, filtrado por fecha y búsqueda.
- **Transacciones Recurrentes**: Definir plantillas de transacciones que se generan automáticamente según un horario (ej. alquiler mensual).
- **Herramientas de Presupuesto**: Presupuestos mensuales simples para monitorear gastos contra límites, con barras de progreso visuales.
- **Informes**: Resúmenes mensuales visuales, historial de saldos y desgloses por categorías con gráficos vía Recharts.
- **Importación/Exportación de Datos**: Soporte completo para importación CSV de transacciones y exportación de transacciones, presupuestos e informes PDF.
- **Interfaz Amigable**: Diseño responsive, navegación intuitiva e interacciones agradables usando Shadcn UI y Tailwind CSS.
- **Persistencia Segura**: Backend impulsado por Cloudflare Durable Objects para operaciones de datos confiables y atómicas.
- **Configuración**: Moneda personalizable, inicio de mes fiscal, preferencias de tema y gestión de categorías y frecuencias recurrentes.
La aplicación garantiza una experiencia fluida en todos los dispositivos, con diseños responsive mobile-first y mejores prácticas de accesibilidad.

## Pila Tecnológica
- **Frontend**: React 18, TypeScript, React Router, Shadcn UI, Tailwind CSS 3, Framer Motion (micro-interacciones), Recharts (gráficos), Date-fns (utilidades de fecha), Zustand (gestión de estado), Sonner (notificaciones).
- **Backend**: Cloudflare Workers, Hono (enrutamiento), Durable Objects (vía wrappers de Entity personalizados para persistencia).
- **Herramientas de Compilación**: Vite (empaquetador), Bun (gestor de paquetes), Wrangler (despliegue).
- **Utilidades**: Lucide React (iconos), Zod (validación), Immer (actualizaciones inmutables), clsx/tailwind-merge (ayudantes de estilos), jsPDF (generación PDF).
- **Compartido**: Respuestas API type-safe y modelos de datos en TypeScript.
No se requieren APIs externas ni servidores adicionales—todos los datos se almacenan del lado del cliente vía el binding único GlobalDurableObject.

## Instalación
Requisitos previos:
- [Bun](https://bun.sh/) instalado (versión 1.0+ recomendada).
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) para despliegue (opcional para desarrollo local).

1. Clonar el repositorio:
   ```
   git clone <repository-url>
   cd moneyo
   ```
2. Instalar dependencias usando Bun:
   ```
   bun install
   ```
3. (Opcional) Generar tipos TypeScript desde los bindings del Worker:
   ```
   bun run cf-typegen
   ```
El proyecto está preconfigurado—no se necesita configuración adicional para componentes Shadcn UI o Tailwind.

## Uso
### Ejecución Local
Iniciar el servidor de desarrollo:
```
bun run dev
```
La aplicación estará disponible en `http://localhost:3000` (o el puerto especificado en tu entorno). Incluye recarga en caliente para cambios del frontend y proxy de llamadas API al Worker.

### Interacciones Básicas
- **Dashboard (Inicio)**: Ver saldo total, transacciones recientes y acciones rápidas como "Agregar Transacción".
- **Cuentas**: Listar y gestionar cuentas (ej. crear una nueva cuenta "Efectivo").
- **Transacciones**: Filtrar por fecha, cuenta o tipo; agregar/editar vía formularios intuitivos en modales.
- **Informes**: Generar resúmenes mensuales con gráficos de barras para categorías.
- **Configuración**: Ajustar moneda (ej. USD, EUR) y tema (claro/oscuro).

Ejemplo de llamada API desde el frontend (usando el helper `api` proporcionado):
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

## Solución de Problemas
- **Tema o Moneda No Se Actualizan**: La aplicación usa `localStorage` para persistir configuraciones de tema y moneda. Si encuentras problemas, intenta limpiar el localStorage del navegador para el sitio.
- **Compatibilidad con Navegadores**: La aplicación está probada en versiones modernas de Chrome, Firefox y Safari. Navegadores antiguos pueden tener problemas de renderizado.
- **Errores de Compilación**: Asegúrate de que todas las dependencias estén instaladas con `bun install`. Si persisten errores de TypeScript, ejecuta `bun run cf-typegen` para actualizar los tipos del worker.

## Despliegue
Desplegar en Cloudflare Workers para runtime global edge:
1. Iniciar sesión en Cloudflare:
   ```
   wrangler login
   ```
2. Publicar el proyecto:
   ```
   bun run deploy
   ```
   Esto compila el frontend (Vite) y despliega el bundle del Worker. La aplicación estará activa en tu subdominio Workers (ej. `moneyo-fqyoxziaw_plrx7p6fcfh.your-account.workers.dev`).
3. **Monitoreo**: Usa `wrangler tail` para ver logs en vivo de tu worker desplegado. Revisa el dashboard de Cloudflare para analíticas e informes de errores.
4. **Dominios Personalizados**: Para usar un dominio personalizado, agrégalo a tu cuenta Cloudflare y actualiza `wrangler.jsonc` con las rutas apropiadas antes de desplegar.

[cloudflarebutton]

## Colaboración
1. Hacer fork del repositorio.
2. Crear una rama de características (`git checkout -b feature/amazing-feature`).
3. Confirmar cambios (`git commit -m 'Add some amazing feature'`).
4. Enviar a la rama (`git push origin feature/amazing-feature`).
5. Abrir un Pull Request.
Sigue el roadmap por fases en el blueprint para colaboraciones. Asegúrate de no hacer cambios rompientes en utilidades principales.

## Licencia
Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
//