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

## Configuración de Variables de Entorno

Para el correcto funcionamiento del aplicativo, especialmente en entornos de producción o para la integración con servicios externos, es necesario configurar algunas variables de entorno.

### Frontend (`client/.env`)

Crea un archivo `.env` en el directorio `client/` con el siguiente contenido:

```
VITE_API_BASE_URL=http://localhost:3001
```

*   Para desarrollo local, `http://localhost:3001` es la URL por defecto del backend.
*   Para despliegues en producción (ej. GitHub Pages), esta URL debe apuntar a la dirección pública de tu backend.

### Backend (`server/.env`)

Si utilizas la funcionalidad de sincronización con Google Drive, el backend requiere una clave API de Google. Crea un archivo `.env` en el directorio `server/` con el siguiente contenido:

```
GOOGLE_API_KEY=TU_CLAVE_API_DE_GOOGLE
```

Reemplaza `TU_CLAVE_API_DE_GOOGLE` con tu clave API real. **Nunca expongas esta clave en el código fuente del frontend.**
