# JMstore

## Conectar con Supabase

La aplicación usa Supabase como PostgreSQL a través del backend FastAPI. El frontend **no** se conecta directamente a la base de datos y no necesita una clave `anon` ni `service_role`.

1. En un proyecto Supabase vacio, abre **SQL Editor** y ejecuta una vez el contenido de [`schema.supabase.sql`](schema.supabase.sql). En una base existente, aplica las migraciones necesarias para existencias y costos; no vuelvas a ejecutar el esquema completo en una base que ya tenga esas tablas.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL` con la cadena PostgreSQL del panel **Connect** de Supabase. Para un backend persistente en una red IPv4, usa la cadena **Session pooler**. Si la contrasena incluye caracteres reservados de URI, codificala antes de incluirla.
3. En `backend/.env`, cambia `SECRET_KEY` por un valor aleatorio y ajusta `CORS_ORIGINS` a los orígenes exactos desde donde se servirá el frontend, separados por comas.
4. Instala y ejecuta el backend desde `backend`:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

5. En desarrollo, Vite envía `/api` y `/uploads` al backend local `http://localhost:8000`. Para desplegar frontend y backend en dominios distintos, copia `frontend/.env.example` a `frontend/.env` y asigna `VITE_API_URL` a la URL pública del backend, terminada en `/api/v1`. Vuelve a generar el frontend después de cambiar esta variable.

El backend acepta `postgres://` y `postgresql://` en `DATABASE_URL` y los conecta mediante Psycopg. El backend usa exclusivamente PostgreSQL de Supabase; configura sus credenciales en `backend/.env`.

## Importar productos

Abre **Inventario e importación** en el menú. Puedes cargar archivos `.csv` o `.xlsx` de hasta 10 MB. El archivo debe incluir `nombre` y `precio`; también acepta `sku`, `marca`, `stock`, `stock_critico`, `descripcion` e `imagen_url`. Si no incluyes la marca como columna, selecciónala como marca por defecto en la pantalla. Las filas con un SKU que ya exista para esa marca actualizan el producto.

Para bases Supabase que ya existían antes de agregar el inventario, ejecuta una vez la migración de `stock` indicada en el paso 1 de esta guía antes de importar productos.


En Inventario, el costo de compra, env?o asignado y margen se guardan en c?rdobas. El costo total, utilidad y precio sugerido se calculan en la base de datos. F?rmula: costo total = compra + env?o; utilidad = costo total ? margen; precio sugerido = costo total + utilidad. El precio de venta final se puede ajustar.

## Imágenes de productos

Para guardar fotos de forma persistente y mostrarlas en el catálogo, ejecuta una vez [`supabase_product_images.sql`](supabase_product_images.sql) en el SQL Editor de Supabase. Esto crea el bucket público `product-images`, limitado a PNG/JPG de hasta 5 MB. Las imágenes se pueden cargar al editar un producto desde Inventario o al registrar una compra; el catálogo toma la imagen guardada en `productos.imagen_url`.

Configura `SUPABASE_URL` (la URL del proyecto) y `SUPABASE_SECRET_KEY` como variables de entorno del backend y en Vercel para Production/Preview según necesites. En Vercel, agrega ambas en **Project Settings > Environment Variables** y vuelve a desplegar. La clave secreta debe permanecer solo en el backend, nunca en una variable `VITE_*` ni en el frontend.

## Facturaci?n

La pantalla de Facturación permite buscar productos con existencias, asignar o crear un cliente, ajustar cantidades y descuentos, registrar un pago completo o parcial y emitir la factura. La pestaña **Ventas y cuentas** resume totales cobrados y pendientes, agrupa los saldos por cliente y muestra cuotas por factura. Los abonos posteriores quedan registrados con método, monto y fecha. Al emitir la venta, la API valida el stock en una transacción y reduce las existencias. La factura puede imprimirse o guardarse como PDF desde el navegador. El número de factura se forma con el prefijo `FV-` y el ID de venta.

## Personalización y usuarios

Desde **Administración > Tema y apariencia** puedes cambiar la paleta, tipografía, nombre y logo del negocio. Estos ajustes se guardan en el navegador actual y deben configurarse nuevamente en otros equipos.

En el primer acceso, si la tabla `usuarios` esta vacia, la pantalla de login permite registrar al administrador inicial. Para habilitar el login, configura `SECRET_KEY` en `backend/.env` con una clave aleatoria privada de al menos 32 caracteres (genera una con `python -c "import secrets; print(secrets.token_urlsafe(48))"`) y reinicia el backend. Las sesiones duran 8 horas; los endpoints de negocio requieren sesion y solo el rol administrador puede gestionar cuentas.

## Desplegar en Vercel

El archivo `vercel.json` configura el frontend Vite y el backend FastAPI como dos Vercel Services bajo un mismo dominio.

1. Importa el repositorio en Vercel. Deja **Root Directory** en la raíz del repositorio y selecciona **Services** como framework del proyecto.
2. En las variables de entorno del proyecto configura `DATABASE_URL` con la conexión de Supabase y `SECRET_KEY` con una clave aleatoria privada de al menos 32 caracteres. Si `VITE_API_URL` está definida, usa `/api/v1`; elimina cualquier valor que apunte a `localhost`.
3. Despliega de nuevo. El rewrite de `/api/*` envía las solicitudes al backend y el resto de rutas al frontend.
4. Ejecuta `schema.supabase.sql` en el SQL Editor del proyecto Supabase antes del primer uso.

Los logos cargados se guardan temporalmente en `/tmp` cuando se ejecuta en Vercel; el almacenamiento temporal no persiste entre instancias o despliegues. Para conservarlos, configura un almacenamiento de objetos externo.

No subas archivos `.env`; configuralos en **Project Settings > Environment Variables** de Vercel. Los archivos cargados al disco local del backend no son almacenamiento persistente en Vercel; usa almacenamiento externo si la aplicacion necesita conservar logos o imagenes subidos.
