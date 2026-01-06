@echo off
echo ============================================
echo   INSTRUCCIONES PARA CORREGIR ERROR 500
echo ============================================
echo.
echo El error se debe a CREDENCIALES INCORRECTAS de PostgreSQL
echo.
echo Error PostgreSQL: 28P01 - Authentication failed
echo Usuario: postgres
echo Password configurado: administrador (INCORRECTO)
echo.
echo ============================================
echo   SOLUCIONES:
echo ============================================
echo.
echo OPCION 1: Actualizar .env con la password correcta
echo    1. Abre el archivo .env en la raiz del proyecto
echo    2. Cambia la linea: PG_PASSWORD=administrador
echo    3. Por: PG_PASSWORD=tu_password_real
echo.
echo OPCION 2: Restablecer password de PostgreSQL
echo    1. Abre pgAdmin o psql
echo    2. Ejecuta: ALTER USER postgres PASSWORD 'administrador';
echo.
echo OPCION 3: Crear usuario nuevo para el proyecto
echo    CREATE USER eclat_user WITH PASSWORD 'eclat_pass';
echo    GRANT ALL PRIVILEGES ON DATABASE eclat TO eclat_user;
echo    Luego actualiza PG_USER y PG_PASSWORD en .env
echo.
echo ============================================
echo   VERIFICAR CONEXION:
echo ============================================
echo.
echo Ejecuta en terminal: psql -U postgres -h localhost -d eclat
echo Si pide password, ingresa la correcta y actualiza .env
echo.
echo ============================================
pause
