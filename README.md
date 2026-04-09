# Tablers - Generador de Tableros Analíticos (MVP)

Tablers es un generador de tableros de control "self-service" inspirado en Zoho Analytics y Looker Studio. Permite a usuarios con conocimientos técnicos medios conectar fuentes de datos, realizar consultas agregadas y visualizar resultados en gráficos interactivos de forma visual.

## Características Core

- **Gestión de Dashboards:**
  - Creación, edición y eliminación de tableros.
  - Configuración de hasta 6 gráficos por tablero.
- **Conector de Datos Flexible:**
  - Carga de archivos: SQL Dumps (`.sql`), CSV y Excel (`.xlsx`).
  - Conexión directa: Soporta PostgreSQL y MySQL.
  - Almacenamiento local: Los archivos subidos se procesan automáticamente en una instancia de SQLite para consultas rápidas.
- **Configuración Visual de Gráficos:**
  - Tipos: Barras, Líneas, Pastel y Tablas (Heatmap).
  - Agregaciones SQL dinámicas: SUM, COUNT, AVG, MIN, MAX.
  - Filtros WHERE configurables en tiempo real.
- **Dashboard Interactivo:**
  - Layout responsive con CSS Grid.
  - Tooltips, leyendas y animaciones suaves con ECharts.
  - Botón de refresco global para actualizar datos sin recargar la página.

## Stack Tecnológico

- **Frontend:** React 18, Vite, Tailwind CSS, Apache ECharts, Axios, Lucide React.
- **Backend:** Node.js, Express, TypeScript, Knex.js (para ORM y migraciones), Multer.
- **Base de Datos:** SQLite (local), PostgreSQL/MySQL (conectores).
- **Configuración:** Variables de entorno para la gestión segura de credenciales y configuraciones.

## Despliegue

- **Integración Continua/Despliegue Continuo (CI/CD):** Configurado con GitHub Actions para automatizar pruebas y despliegues.

## Seguridad
- **Prevención de Inyección SQL:** Consultas parametrizadas con Knex y validación exhaustiva de entradas (nombres de tablas, columnas, funciones de agregación, operadores de filtro) en el backend.
- **Manejo Seguro de API Keys:** Las claves API externas (ej. Google API Key) se gestionan de forma segura en el backend a través de variables de entorno, nunca expuestas en el frontend.
- **Prevención de SSRF:** Implementación de validaciones para evitar conexiones a servicios internos o IPs privadas en la configuración de fuentes de datos.
- **Validación de Archivos:** Por extensión y tamaño (límite 50MB) durante la carga.
- **Sanitización de Datos:** Nombres de tablas y columnas sanitizados durante la importación.
- **Compatibilidad con GitHub Pages:** Configuración del frontend para un despliegue seguro y funcional en GitHub Pages.
