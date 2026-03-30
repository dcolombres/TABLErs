# Tablers - Generador de Tableros Analíticos (MVP)

Tablers es un generador de tableros de control "self-service" inspirado en Zoho Analytics y Looker Studio. Permite a usuarios con conocimientos técnicos medios conectar fuentes de datos, realizar consultas agregadas y visualizar resultados en gráficos interactivos de forma visual.

## Características Core

- **Conector de Datos Flexible:**
  - Carga de archivos: SQL Dumps (`.sql`), CSV y Excel (`.xlsx`).
  - Conexión directa: Soporta PostgreSQL y MySQL.
  - Almacenamiento local: Los archivos subidos se procesan automáticamente en una instancia de SQLite para consultas rápidas.
- **Configuración Visual de Gráficos:**
  - Hasta 6 gráficos por tablero.
  - Tipos: Barras, Líneas, Pastel y Tablas (Heatmap).
  - Agregaciones SQL dinámicas: SUM, COUNT, AVG, MIN, MAX.
  - Filtros WHERE configurables en tiempo real.
- **Dashboard Interactivo:**
  - Layout responsive con CSS Grid.
  - Tooltips, leyendas y animaciones suaves con ECharts.
  - Botón de refresco global para actualizar datos sin recargar la página.
- **Arquitectura Premium:**
  - Backend en Node.js + TypeScript (limpio y tipado).
  - Frontend en React + Tailwind CSS + Lucide Icons.
  - Diseñado con estética Dark Mode premium (Slate/Primary palette).

## Stack Tecnológico

- **Frontend:** React 18, Vite, Tailwind CSS, Apache ECharts, Axios, Lucide React.
- **Backend:** Node.js, Express, TypeScript, Knex.js, Multer.
- **Base de Datos:** SQLite (local), PostgreSQL/MySQL (conectores).

## Seguridad

- Consultas SQL parametrizadas mediante Knex para prevenir SQL Injection.
- Validación de archivos por extensión y tamaño (límite 50MB).
- Sanitización de nombres de tablas y columnas durante la importación.
