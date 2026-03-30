# Instructivo de Instalación y Pruebas

Este documento detalla los pasos para levantar el MVP del Generador de Tableros Analíticos en un entorno de desarrollo local.

## Prerrequisitos

- Node.js (v18+)
- npm o yarn
- Un navegador moderno (Chrome/Edge/Firefox)

## Levantar el Backend

1. Navega a la carpeta del servidor:
   ```bash
   cd server
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El servidor correrá en `http://localhost:3001`.*

## Levantar el Frontend

1. Navega a la carpeta del cliente (abre otra terminal):
   ```bash
   cd client
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo (Vite):
   ```bash
   npm run dev
   ```
   *Vite abrirá la aplicación en `http://localhost:5173` (o similar).*

## Cómo probar con el Dump SQL de ejemplo

1. Al abrir la aplicación, verás el selector de fuente de datos.
2. Selecciona **"Subir Archivo"**.
3. Sube el archivo `ventas.sql` que se encuentra en la raíz del proyecto.
4. Una vez procesado, serás redirigido al Dashboard vacío.
5. Haz clic en **"Añadir Gráfico"**.
6. Configura tu primer gráfico:
   - **Título:** "Ventas por Categoría"
   - **Tabla:** `ventas` (Puedes notar que se cargan automáticamente las tablas del SQL).
   - **X (Categoría):** `fecha` o `producto_id`.
   - **Y (Valor):** `monto`.
   - **Agregación:** `SUM`.
7. Haz clic en **"Guardar Cambios"** y ¡listo!

## Variables de Entorno (Opcional)

Si deseas conectar una base de datos PostgreSQL o MySQL externa, asegúrate de tener las credenciales correctas en el formulario de "Conexión Directa". No se requiere un archivo `.env` por defecto para el modo SQLite.
