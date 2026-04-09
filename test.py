import requests
import os
import sys

SERVER_URL = "http://127.0.0.1:3002" # Asumiendo que el servidor corre en este puerto
DB_PATH = os.path.join(os.path.dirname(__file__), 'server', 'data.sqlite')
CACHE_DB_PATH = os.path.join(os.path.dirname(__file__), 'server', 'tablers_cache.sqlite')

def check_database_connection():
    """
    Verifica la existencia y accesibilidad de los archivos de base de datos SQLite.
    """
    print("--- Verificando conexión a la base de datos ---")
    db_status = True
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Archivo de base de datos principal no encontrado en: {DB_PATH}")
        print("Sugerencia: Asegúrate de que el servidor haya inicializado la base de datos o que el archivo no haya sido movido/eliminado.")
        db_status = False
    else:
        print(f"OK: Archivo de base de datos principal encontrado en: {DB_PATH}")

    if not os.path.exists(CACHE_DB_PATH):
        print(f"ADVERTENCIA: Archivo de caché de base de datos no encontrado en: {CACHE_DB_PATH}")
        print("Sugerencia: Esto podría ser normal si la caché aún no se ha generado, pero verifica si debería existir.")
    else:
        print(f"OK: Archivo de caché de base de datos encontrado en: {CACHE_DB_PATH}")
    
    print("-" * 50)
    return db_status

def check_server_connection():
    """
    Verifica la conexión al servidor backend intentando acceder a un endpoint.
    """
    print("--- Verificando conexión al servidor ---")
    try:
        # Intentar acceder a un endpoint conocido, por ejemplo, la raíz o un health check
        # Si el servidor tiene un endpoint de health check específico, sería mejor usarlo.
        response = requests.get(f"{SERVER_URL}/api/dashboards", timeout=5) # Usando /api/dashboards como endpoint de salud
        if response.status_code == 200:
            print(f"OK: Servidor accesible en {SERVER_URL}. Código de estado: {response.status_code}")
            print("Sugerencia: El servidor parece estar funcionando correctamente.")
            return True
        else:
            print(f"ERROR: Servidor respondió con código de estado {response.status_code} en {SERVER_URL}/api/dashboards")
            print("Sugerencia: El servidor está respondiendo, pero el endpoint de salud no devuelve 200 OK. Revisa los logs del servidor.")
            return False
    except requests.exceptions.ConnectionError:
        print(f"ERROR: No se pudo conectar al servidor en {SERVER_URL}.")
        print("Sugerencia: Asegúrate de que el servidor esté iniciado y escuchando en el puerto correcto. Verifica la URL y el puerto.")
        return False
    except requests.exceptions.Timeout:
        print(f"ERROR: Tiempo de espera agotado al intentar conectar con el servidor en {SERVER_URL}.")
        print("Sugerencia: El servidor puede estar sobrecargado o la red es lenta. Verifica el estado del servidor.")
        return False
    except Exception as e:
        print(f"ERROR: Ocurrió un error inesperado al conectar con el servidor: {e}")
        print("Sugerencia: Revisa los logs del servidor para más detalles.")
        return False
    finally:
        print("-" * 50)

def main():
    print("--- Iniciando pruebas de conectividad para Tablers ---")
    
    db_ok = check_database_connection()
    server_ok = check_server_connection()

    print("\n--- Resumen de las pruebas ---")
    if db_ok and server_ok:
        print("¡Todas las conexiones principales parecen estar OK!")
        sys.exit(0)
    else:
        print("Se detectaron problemas en una o más conexiones. Revisa los mensajes de error y sugerencias.")
        sys.exit(1)

if __name__ == "__main__":
    main()
