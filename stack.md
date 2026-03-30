# Stack Tecnológico

## Propuesta de Backend

Se evaluaron dos opciones para el backend del MVP:

1. **Opción A: Node.js + Express (Seleccionada)**
   - **Justificación:** Desarrollo extremadamente rápido, ecosistema robusto para manejo de archivos (Multer) y bases de datos. Permite compartir lógica de tipos (TypeScript) si se desea. Muy performante para APIs I/O-bound.
   - **Librerías principales:** `express`, `multer`, `sqlite3`, `pg`, `mysql2`, `knex` (Constructor de SQL), `xlsx`, `csv-parser`.

2. **Opción B: Python + FastAPI**
   - **Justificación:** Excelente para procesamiento de datos si se requiere lógica matemática compleja o integración con Pandas. Muy moderno y rápido.
   - **Librerías principales:** `fastapi`, `sqlalchemy`, `pandas`, `uvicorn`.

**Selección:** **Node.js + Express** debido a la agilidad de desarrollo del frontend (React) y la facilidad de integrar todo en un mismo lenguaje si Diego prefiere JS/TS.

## Frontend

- **Core:** React (con Vite) + TypeScript.
- **Estilos:** Tailwind CSS + Lucide React (Sugerido en `z-gemini.md`).
- **Visualización:** **Apache ECharts**. Es más potente que Chart.js para dashboards tipo "Looker" y más fácil de configurar que D3 para un MVP.
- **Animaciones:** Subtle micro-animations with CSS and Framer Motion (opcional).

## Base de Datos
- **Interna (Cargas):** SQLite (Local file).
- **Conectores:** PostgreSQL, MySQL nativos.

## Seguridad
- **Sanitización:** Uso de `knex` o consultas parametrizadas para evitar SQL Injection.
- **Validación:** `zod` o `joi` para esquemas de API.
- **Archivos:** Validación por extensión y tamaño (máx 50MB).
