# Guia de integracion Flutter - API Artesanias

Guia basada en las rutas y schemas actuales del repositorio. El servidor Bun/Elysia usa el puerto `3000` por defecto y escucha en `0.0.0.0`.

## 1. Base URL

| Entorno | Base URL |
| --- | --- |
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator | `http://127.0.0.1:3000` |
| Telefono fisico | `http://IP_DE_LA_COMPUTADORA:3000` |

El telefono y la computadora deben estar en la misma red. En produccion use HTTPS y el dominio real.

## 2. Requisitos Flutter

- Use un cliente HTTP (`http`, `dio` u otro) con timeout de conexion, envio y lectura.
- Guarde el JWT en almacenamiento seguro, por ejemplo `flutter_secure_storage`; no lo ponga en logs ni en preferencias sin cifrar.
- En endpoints protegidos envie `Authorization: Bearer <token>`.
- Trate UUID como `String`, nunca como entero.
- Envie timestamps ISO-8601, por ejemplo `2026-09-21T15:30:00.000Z`. `purchaseDate` exige `date-time`; las fechas de entrega tambien se convierten a `Date`.
- Compras, ventas, pedidos, pagos y entregas usan importes enteros en centavos: `4500` = `$45.00`. Las cantidades son enteros de piezas.
- El `stockQuantity` inicial de un producto crea un lote FIFO sintetico, sin compra asociada (`purchaseId: null`), y queda disponible para ventas, reservas y cancelaciones.
- Las correcciones de pagos conservan el pago original como `corrected` y agregan una compensacion auditable con monto negativo. Solo los pagos `active` y `compensation` forman el saldo; no se debe reutilizar la misma correccion.
- Excepcion real: el input de producto recibe `salePrice`, `dozenPrice` y `costPrice` como numeros en unidades monetarias y el servicio convierte los precios `* 100`.
- Modele estados de loading, exito y error por solicitud. Use cancelacion al salir de pantalla (`CancelToken` en Dio o equivalente).
- `401`: borrar JWT y volver a login. `403`: mostrar falta de permisos y no reintentar. `404`: recurso inexistente. `409`: duplicado/conflicto. `422`: corregir datos, no reintentar igual.
- `429`: respetar `Retry-After` (segundos) y usar backoff con jitter. Login/registro: 10 solicitudes por IP cada 15 minutos; pagos: 30 por IP cada 15 minutos.
- Reintente solo errores de red o 5xx transitorios, pocas veces y con backoff. No reintente mutaciones sin idempotencia.

## 3. Envelope

Exito:

```json
{
  "success": true,
  "data": { "id": "00000000-0000-4000-8000-000000000001" },
  "error": null,
  "meta": null
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son validos",
    "details": {}
  },
  "meta": null
}
```

Codigos frecuentes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DUPLICATE_ENTRY`, `FOREIGN_KEY_VIOLATION`, `RATE_LIMITED`, `CONFIRMATION_REQUIRED`, `INTERNAL_ERROR`. Un error `429` incluye `details.retryAfter` y `Retry-After`.

## 4. Autenticacion

### Login

`POST /api/v1/auth/login` es publico. Acepta `email` y `password` (8..200 caracteres):

```json
{ "email": "admin@ejemplo.com", "password": "secreto-de-8-caracteres" }
```

Guarde `data.token` y `data.user`. El usuario incluye `id`, `name`, `email`, `role`, `active` y timestamps. Roles: `admin`, `seller`, `family`.

### Registro controlado

`POST /api/v1/auth/register` esta deshabilitado por defecto. Solo funciona con `AUTH_REGISTRATION_ENABLED=true`, `AUTH_BOOTSTRAP_TOKEN` configurado (minimo 32 caracteres) y este header:

```http
X-Bootstrap-Token: TOKEN_DE_BOOTSTRAP
Content-Type: application/json
```

Acepta `name`, `email`, `password` y siempre crea un usuario `admin`. Si esta deshabilitado responde `404`.

### `/me`, logout y expiracion

- `GET /api/v1/auth/me` requiere un JWT valido y devuelve `{ "user": ... }`.
- `POST /api/v1/auth/logout` requiere Bearer, incrementa la version del token en servidor y revoca el JWT actual. Flutter debe borrar el token localmente tras la respuesta y tambien ante `401`.
- `JWT_EXPIRES_IN` controla la vigencia y por defecto es `7d`. JWT invalido o expirado produce `401`.

## 5. Endpoints reales

Todos requieren Bearer salvo que se indique lo contrario. Los roles son los que comprueba el codigo.

### Auth y operacion

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | Publico | Iniciar sesion |
| POST | `/api/v1/auth/register` | Publico + bootstrap, condicional | Crear primer admin |
| GET | `/api/v1/auth/me` | Bearer | Usuario actual |
| POST | `/api/v1/auth/logout` | Bearer | Revocar la sesion actual; borrar token local |
| GET | `/health` | Publico | Estado del servicio |
| GET | `/api/v1/health` | Publico | Estado del servicio |

### Categorias (`/api`)

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/categories` | Bearer | Listar activas; `includeInactive=true` incluye inactivas |
| GET | `/api/categories/:id` | Bearer | Obtener |
| POST | `/api/categories` | admin, seller | Crear `{ "name": "..." }` |
| PUT | `/api/categories/:id` | admin, seller | Actualizar nombre |
| PATCH | `/api/categories/:id/active` | admin, seller | Activar/desactivar |
| DELETE | `/api/categories/:id?confirm=true` | admin, seller | Desactivar logicamente; requiere confirmacion |

### Productos (`/api`)

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/products?page=1&limit=20&categoryId=UUID&search=texto` | Bearer | Listar activos |
| GET | `/api/products/:id` | Bearer | Obtener |
| POST | `/api/products` | admin, seller | Crear |
| PUT | `/api/products/:id` | admin, seller | Actualizar |
| PATCH | `/api/products/:id/active` | admin, seller | Activar/desactivar |
| DELETE | `/api/products/:id?confirm=true` | admin, seller | Desactivar logicamente |

### Inventario

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/inventory` | admin, seller | Inventario; `lowStock=true` filtra bajo minimo |
| GET | `/api/v1/inventory/low-stock` | admin, seller | Bajo minimo |
| GET | `/api/v1/inventory/movements?page=1&limit=20&productId=UUID&movementType=adjustment&referenceType=product` | admin, seller | Historial de movimientos paginado y filtrable |

### Proveedores

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/suppliers` | admin, seller | Listar |
| GET | `/api/v1/suppliers/:id` | admin, seller | Obtener |
| POST | `/api/v1/suppliers` | admin, seller | Crear |
| PATCH | `/api/v1/suppliers/:id` | admin, seller | Actualizar campos enviados, incluido `active` |
| DELETE | `/api/v1/suppliers/:id` | admin | Desactivar logicamente (`active=false`) |

### Compras

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/purchases?page=1&limit=20` | admin, seller | Listar surtidos paginados |
| GET | `/api/v1/purchases/:id` | admin, seller | Surtido y detalles |
| POST | `/api/v1/purchases` | admin, seller | Registrar surtido e inventario |

### Clientes

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/customers` | admin, seller | Listar |
| GET | `/api/v1/customers/:id` | admin, seller | Obtener |
| POST | `/api/v1/customers` | admin, seller | Crear |
| PATCH | `/api/v1/customers/:id` | admin, seller | Actualizar |
| DELETE | `/api/v1/customers/:id` | admin | Desactivar logicamente (`active=false`) |

### Ventas

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/sales?page=1&limit=20` | admin, seller | Listar paginadas |
| GET | `/api/v1/sales/:id` | admin, seller | Venta, detalles y pagos |
| POST | `/api/v1/sales` | admin, seller | Crear venta y descontar stock |
| POST | `/api/v1/sales/:id/payments` | admin, seller | Registrar pago |
| POST | `/api/v1/sales/:id/payments/:paymentId/correct` | admin | Corregir pago una sola vez con compensacion auditable |
| POST | `/api/v1/sales/:id/cancel` | admin | Cancelar venta |

### Pedidos

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/orders?page=1&limit=20` | admin, seller | Listar paginados |
| GET | `/api/v1/orders/:id` | admin, seller | Pedido, detalles y pagos |
| POST | `/api/v1/orders` | admin, seller | Crear y reservar con anticipo |
| PATCH | `/api/v1/orders/:id/status` | admin, seller | Avanzar estado valido |
| POST | `/api/v1/orders/:id/payments` | admin, seller | Registrar pago |
| POST | `/api/v1/orders/:id/payments/:paymentId/correct` | admin | Corregir pago una sola vez con compensacion auditable |
| POST | `/api/v1/orders/:id/delivery` | admin, seller | Registrar entrega |
| POST | `/api/v1/orders/:id/cancel` | admin | Cancelar y devolver reserva |
| POST | `/api/v1/orders/expire-reservations` | admin | Vencer reservas |

### Dashboard

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/dashboard` | admin, seller | Ventas del dia, utilidad, pedidos, pagos pendientes, bajo stock y entregas |

### Usuarios

| Metodo | Ruta | Auth/rol | Finalidad |
| --- | --- | --- | --- |
| GET | `/api/v1/users` | admin | Listar |
| GET | `/api/v1/users/:id` | admin | Obtener |
| POST | `/api/v1/users` | admin | Crear; role opcional |
| PATCH | `/api/v1/users/:id` | admin | Actualizar |
| PATCH | `/api/v1/users/:id/status` | admin | Activar/desactivar |

Swagger esta en `/api/v1/docs`; sirve como referencia auxiliar, no como sustituto de estos schemas.

## 6. Paginacion

Solo `products`, `purchases`, `sales` y `orders` son paginados. `page` minimo es 1, `limit` acepta 1..100 y el default es 20.

```json
{
  "success": true,
  "data": { "items": [], "pagination": { "page": 1, "limit": 20, "total": 0 } },
  "error": null,
  "meta": null
}
```

Categorias, inventario, proveedores, clientes, usuarios y dashboard no son paginados.

## 7. Ejemplos JSON

Todos los UUID siguientes son ficticios: sustituyalos por UUID reales existentes.

### Categoria

```json
{ "name": "Tazas" }
```

### Producto

```json
{
  "name": "Taza barro",
  "categoryId": "00000000-0000-4000-8000-000000000001",
  "description": "Taza artesanal",
  "imageUrl": "https://ejemplo.test/taza.jpg",
  "salePrice": 45.00,
  "dozenPrice": 480.00,
  "costPrice": 20.00,
  "stockQuantity": 24,
  "minimumStock": 6
}
```

`categoryId` debe existir y estar activa. `costPrice` se persiste como `costPriceCents` y `stockQuantity` crea un movimiento `adjustment` con nota de stock inicial dentro de la misma transaccion. Los precios de venta se persisten en centavos. En `PUT /api/products/:id`, `stockQuantity` no se acepta: use compras o un ajuste de inventario.

### Proveedor

```json
{
  "name": "Proveedor Barro SA",
  "city": "Oaxaca",
  "phone": "9510000000",
  "notes": "Entrega semanal"
}
```

### Compra

```json
{
  "supplierId": "00000000-0000-4000-8000-000000000002",
  "purchaseDate": "2026-09-21T15:30:00.000Z",
  "costs": { "transportCents": 15000, "loadingCents": 2000, "packagingCents": 0, "foodCents": 0, "otherCents": 500 },
  "notes": "Surtido de septiembre",
  "items": [{ "productId": "00000000-0000-4000-8000-000000000003", "quantity": 24, "supplierUnitCostCents": 2000 }]
}
```

### Venta

```json
{
  "saleType": "patio",
  "items": [{ "productId": "00000000-0000-4000-8000-000000000003", "quantity": 2, "pricingMode": "unit" }],
  "discountCents": 0,
  "notes": "Venta mostrador",
  "initialPaymentCents": 9000
}
```

Para docena use `pricingMode: "dozen"`, configure `dozenPrice` y envie cantidad positiva multiplo de 12.

### Cliente

```json
{
  "name": "Cliente Ejemplo",
  "phone": "9511111111",
  "neighborhood": "Centro",
  "frequentDeliveryPoint": "Plaza principal",
  "notes": "Llamar antes de entregar"
}
```

### Pedido

```json
{
  "customerId": "00000000-0000-4000-8000-000000000004",
  "orderChannel": "whatsapp",
  "items": [{ "productId": "00000000-0000-4000-8000-000000000003", "quantity": 12, "pricingMode": "dozen" }],
  "discountCents": 0,
  "deliveryFeeCents": 5000,
  "deliveryTransportCostCents": 1500,
  "deliveryPackagingCostCents": 500,
  "otherDeliveryCostCents": 0,
  "initialPaymentCents": 10000,
  "initialPaymentMethod": "transfer",
  "deliveryDate": "2026-09-25T18:00:00.000Z",
  "deliveryTime": "18:00",
  "deliveryPoint": "Plaza principal",
  "notes": "Entregar completo"
}
```

### Pago

```json
{ "amountCents": 5000, "paymentMethod": "transfer", "idempotencyKey": "pago-00000000-0000-4000-8000-000000000005" }
```

La clave puede ir en body o, preferentemente, en `Idempotency-Key`.

### Entrega

```json
{
  "deliveryDate": "2026-09-25T18:00:00.000Z",
  "deliveryPoint": "Plaza principal",
  "deliveryTime": "18:00",
  "deliveryTransportCostCents": 1500,
  "deliveryPackagingCostCents": 500,
  "otherDeliveryCostCents": 0
}
```

### Historial y correccion de pagos

Movimientos paginados: `GET /api/v1/inventory/movements?page=1&limit=20&movementType=adjustment`. Requiere rol `admin` o `seller`.

Corregir un pago, solo admin:

```http
POST /api/v1/orders/00000000-0000-4000-8000-000000000007/payments/00000000-0000-4000-8000-000000000008/correct
Authorization: Bearer JWT
Content-Type: application/json
```

```json
{ "correctionNote": "Pago duplicado en captura" }
```

La misma ruta existe para ventas. El pago original queda marcado como `corrected`, se crea un pago compensatorio y una segunda correccion devuelve conflicto.

### Cancelacion y expiracion

Cancelar venta: `POST /api/v1/sales/00000000-0000-4000-8000-000000000006/cancel`, body vacio. Cancelar pedido: `POST /api/v1/orders/00000000-0000-4000-8000-000000000007/cancel`, body vacio. Expirar reservas: `POST /api/v1/orders/expire-reservations`, body vacio, solo admin.

## 8. Reglas de negocio

- Importes de compras, ventas, pedidos, pagos y entregas: centavos enteros no negativos; pagos: enteros positivos.
- Excepcion producto: `salePrice`/`dozenPrice`/`costPrice` entran en unidades monetarias y se convierten a centavos.
- El stock se cuenta por pieza. Una docena consume 12 piezas.
- `pricingMode: "dozen"` exige cantidad multiplo de 12 y precio por docena configurado.
- Las compras crean lotes; costos extra se distribuyen por cantidad. Ventas y pedidos asignan stock FIFO por creacion del lote.
- Un pedido `pending` con anticipo mayor que cero reserva stock por 48 horas (`reservationExpiresAt`). Sin anticipo no se reserva al crearlo.
- Cancelar pedido devuelve piezas reservadas. Expirar busca `pending`/`confirmed` vencidos, los cancela y devuelve stock; hay que invocar el endpoint admin.
- Estados y transiciones: `pending -> confirmed|cancelled`, `confirmed -> preparing|cancelled`, `preparing -> ready|cancelled`, `ready -> delivered|cancelled`. `delivered` y `cancelled` son finales.
- Entrega valida fecha y punto y pasa a `delivered`; no se cancela un pedido entregado ni se paga uno cancelado/entregado.
- Pagos de pedido: `unpaid`, `partial`, `paid`; no superan el saldo. Ventas usan `pending`, `partial`, `paid`.
- `initialPaymentMethod` acepta `cash`, `transfer`, `deposit` u `other`; por defecto es `cash` y se persiste en el pago inicial del pedido.
- Metodos validos: `cash`, `transfer`, `deposit`, `other`.
- Cancelar venta, eliminar clientes/proveedores y expirar reservas requiere admin; categorias/productos requieren admin o seller.

## 9. Headers y curl

```http
Content-Type: application/json
Authorization: Bearer JWT
Idempotency-Key: pago-uuid-o-clave-unica
```

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ejemplo.com","password":"secreto-de-8-caracteres"}'

curl 'http://localhost:3000/api/products?page=1&limit=20' \
  -H 'Authorization: Bearer JWT'

curl -X POST http://localhost:3000/api/v1/orders/00000000-0000-4000-8000-000000000007/payments \
  -H 'Authorization: Bearer JWT' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: pago-00000000-0000-4000-8000-000000000005' \
  -d '{"amountCents":5000,"paymentMethod":"transfer"}'
```

Registro condicional:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -H 'X-Bootstrap-Token: TOKEN_DE_BOOTSTRAP' \
  -d '{"name":"Admin","email":"admin@ejemplo.com","password":"secreto-de-8-caracteres"}'
```

## 10. Flujo recomendado de pantallas

1. **Login**: login, guardar token seguro, cargar `/me` y manejar `401`.
2. **Dashboard**: bajo stock, ventas, pagos pendientes y entregas.
3. **Catalogo/inventario**: categorias, productos paginados, filtros y detalle.
4. **Compra**: proveedor, piezas, costos en centavos, fecha y confirmacion.
5. **Venta rapida**: productos, unidad/docena, stock, anticipo y pagos.
6. **Clientes/pedidos**: cliente, items, entrega, anticipo y estados.
7. **Pagos/entrega**: pago idempotente, saldo, entrega y refresco del detalle.

## 11. Checklist y errores comunes

- [ ] Configurar la Base URL del dispositivo; un telefono fisico no usa `localhost`.
- [ ] Enviar Bearer y borrar token ante `401`.
- [ ] Usar UUID como String y validar que las referencias existan y esten activas.
- [ ] Usar `page >= 1`, `1 <= limit <= 100`, y leer `data.items`/`data.pagination`.
- [ ] Enviar centavos enteros en compras, ventas, pedidos, pagos y entregas.
- [ ] En productos no enviar precios en centavos: `salePrice`/`dozenPrice` esperan unidades monetarias.
- [ ] Al crear un producto, `costPrice` y `stockQuantity` inicializan costo y movimiento de stock. Para modificar existencias use compras o el flujo de inventario, no el PUT de producto.
- [ ] Usar piezas enteras y multiplos de 12 para docenas.
- [ ] No repetir pagos sin `Idempotency-Key`; respetar `Retry-After` en `429`.
- [ ] Confirmar borrados logicos con `?confirm=true` en categorias y productos.
- [ ] `family` no tiene acceso a los modulos actuales; admin es necesario para usuarios, cancelaciones y expiracion.
- [ ] Revisar HTTP status y `error.code`, `error.message`, `error.details`, no solo `success`.

## Aclaraciones de comportamiento actual

- Al crear un producto, `costPrice` se persiste como `costPriceCents` y `stockQuantity` crea un lote FIFO sintetico y un movimiento `adjustment`; `PUT /api/products/:id` no modifica el stock.
- `initialPaymentMethod` ya existe para el anticipo inicial del pedido y acepta `cash`, `transfer`, `deposit` u `other`.
- Logout incrementa `tokenVersion`; el middleware y `/me` rechazan tokens anteriores.
- Los movimientos se consultan en `/api/v1/inventory/movements`; la correccion de pagos solo admite admin, marca el pago original y crea una compensacion. Una segunda correccion devuelve conflicto.
