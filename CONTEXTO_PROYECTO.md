# Contexto del proyecto: Artesanías de Barro

## Propósito

Este proyecto consiste en crear una aplicación móvil y una API para administrar un pequeño emprendimiento familiar de venta de piezas artesanales de barro.

El negocio compra las piezas ya elaboradas a proveedores de Puebla y después las vende en Ecatepec, Estado de México. Las ventas ocurren principalmente:

- Directamente en el patio o domicilio donde se exhibe la mercancía.
- Por medio de un grupo de WhatsApp donde se publican nuevas piezas disponibles.
- Mediante pedidos de clientes, frecuentemente por docena.
- Con entregas en puntos acordados con los clientes.

La aplicación debe ser sencilla, rápida de usar desde un teléfono Android y útil para una persona que no necesita un sistema empresarial complejo.

El objetivo principal es que la dueña del negocio pueda saber con claridad:

- Cuánto dinero invirtió en surtir mercancía desde Puebla.
- Cuántas piezas tiene disponibles actualmente.
- Qué piezas se venden más y cuáles están por terminarse.
- Qué pedidos tiene pendientes, apartados o por entregar.
- Cuánto dinero han pagado los clientes como anticipo.
- Cuánto dinero falta por cobrar.
- Cuánto cuesta hacer una entrega, incluyendo pasaje y empaque.
- Cuánto gana realmente por cada venta, pedido, semana y mes.

---

## Repositorios existentes

El proyecto está dividido en dos repositorios:

| Repositorio | Responsabilidad |
| --- | --- |
| `app-artesanias` | Aplicación móvil para uso diario del negocio. Se planea usar Flutter. |
| `Api-artesanias` | API backend para productos, inventario, surtidos, clientes, pedidos, ventas, pagos, gastos y reportes. Se planea usar Bun con TypeScript. |

Tecnologías sugeridas:

- App móvil: Flutter.
- API: Bun + TypeScript.
- Base de datos: PostgreSQL.
- ORM recomendado: Prisma o Drizzle.
- Panel web opcional: Next.js.
- Fotos de productos: Supabase Storage, Cloudinary o almacenamiento equivalente.
- Mensajería: compartir mensajes prellenados hacia WhatsApp, sin integrar una API de WhatsApp en la primera versión.

---

## Flujo general del negocio

```text
Proveedor de Puebla
        ↓
Compra o surtido de mercancía
        ↓
Registro de productos y costos del surtido
        ↓
Inventario disponible en Ecatepec
        ↓
Venta en patio / Pedido recibido por WhatsApp
        ↓
Apartado, anticipo y preparación del pedido
        ↓
Entrega en punto acordado o recolección en el patio
        ↓
Registro de pago, pasaje, empaque y otros gastos
        ↓
Cálculo de ganancia real y reportes
```

---

## Problemas que debe resolver

Actualmente el negocio puede tener dificultades para controlar información distribuida entre libretas, mensajes de WhatsApp, notas personales y memoria.

La aplicación debe evitar o reducir estos problemas:

- No saber cuántas piezas quedan realmente.
- Vender o apartar productos que ya no están disponibles.
- Olvidar pedidos hechos por WhatsApp.
- Perder control de anticipos y saldos pendientes.
- No contabilizar el pasaje de las entregas.
- No contemplar los gastos de viaje a Puebla al calcular la ganancia.
- No saber cuáles productos se venden más.
- No identificar qué productos se deben volver a surtir.
- No conocer la utilidad real después de costos, transporte y empaques.

---

## Reglas de negocio

## Productos

Las piezas de barro se compran terminadas a proveedores en Puebla. El negocio no fabrica las piezas; las compra para revenderlas en Ecatepec.

Ejemplos de productos:

- Vasos de barro.
- Tazones.
- Ollas.
- Molcajetes.
- Macetas.
- Jarros.
- Cantaritos.
- Piezas decorativas.
- Piezas especiales o de temporada.

Cada producto puede tener variantes:

- Tamaño.
- Color.
- Diseño.
- Capacidad.
- Modelo.
- Tipo de acabado.

Cada producto debe poder tener:

- Nombre.
- Categoría.
- Descripción.
- Foto.
- Precio de venta individual.
- Precio especial por docena, si aplica.
- Stock disponible.
- Stock mínimo.
- Estado activo o inactivo.

---

## Surtidos de Puebla

Un surtido representa una compra de mercancía realizada con un proveedor de Puebla.

Un surtido debe registrar:

- Fecha de compra.
- Proveedor.
- Ciudad o procedencia: Puebla.
- Productos comprados.
- Cantidad comprada de cada producto.
- Costo unitario que cobra el proveedor.
- Pasaje de ida y vuelta.
- Costo de carga o transporte de piezas.
- Bolsas, protección o empaques.
- Comida u otros gastos relacionados con el viaje.
- Notas adicionales.
- Inversión total.

Al guardar un surtido:

1. Debe aumentar el inventario de los productos comprados.
2. Debe guardarse el costo de compra por lote.
3. Deben registrarse los gastos adicionales del surtido.
4. Debe calcularse el costo real aproximado por pieza.
5. Debe actualizarse la inversión total del negocio.

### Fórmula de inversión del surtido

```text
Inversión total =
Costo total de mercancía
+ Pasaje a Puebla
+ Carga o transporte
+ Empaques
+ Otros gastos del surtido
```

### Ejemplo de surtido

```text
Vasos: 60 piezas x $16 = $960
Tazones: 24 piezas x $42 = $1,008
Ollas: 12 piezas x $85 = $1,020
Molcajetes: 10 piezas x $105 = $1,050

Costo de mercancía: $4,038

Pasaje: $700
Carga: $250
Empaques: $120
Comida u otros gastos: $180

Gastos adicionales: $1,250
Inversión total: $5,288
```

---

## Costo real por pieza

El precio del proveedor no siempre representa el costo real de una pieza, porque también se debe considerar el gasto de trasladar los productos desde Puebla hasta Ecatepec.

Para una primera versión, los gastos adicionales del surtido se pueden repartir entre todas las piezas compradas.

```text
Costo extra unitario =
Gastos adicionales del surtido / Total de piezas compradas
```

```text
Costo real unitario =
Costo unitario del proveedor + Costo extra unitario
```

### Ejemplo

```text
Total de piezas compradas: 106
Gastos adicionales: $1,250

Costo extra por pieza:
$1,250 / 106 = $11.79
```

Si un vaso cuesta $16 con el proveedor:

```text
Costo real del vaso:
$16 + $11.79 = $27.79
```

En una versión futura, los gastos del surtido podrían repartirse por peso, volumen o espacio que ocupa cada producto. Para la primera versión, dividirlos entre el total de piezas es suficiente y más fácil de entender.

---

## Inventario

El inventario debe registrarse siempre por pieza individual, incluso cuando se venda por docena.

Ejemplo:

```text
Stock actual de vasos: 48 piezas.

Un cliente compra una docena:
48 - 12 = 36 piezas restantes.
```

No se recomienda manejar “docena de vasos” como un producto diferente si se trata del mismo vaso. La docena es una forma de venta con precio especial, pero el stock siempre se descuenta por unidades.

Tipos de movimientos de inventario:

- Entrada por surtido.
- Salida por venta en patio.
- Salida por pedido entregado.
- Apartado por pedido confirmado.
- Devolución.
- Ajuste manual.
- Merma, daño o ruptura.

Cada movimiento debe tener:

- Producto.
- Tipo de movimiento.
- Cantidad.
- Fecha.
- Usuario responsable, si hay varios usuarios.
- Referencia a surtido, venta o pedido.
- Nota opcional.

---

## Ventas en patio

Una venta en patio ocurre cuando una persona compra directamente en el lugar donde se exhiben las piezas.

La pantalla de venta debe ser rápida y simple.

Datos mínimos:

- Producto.
- Cantidad.
- Precio aplicado.
- Método de pago.
- Fecha.
- Nota opcional.

Métodos de pago:

- Efectivo.
- Transferencia.
- Depósito.
- Otro.

Al confirmar una venta:

1. Se descuenta el inventario.
2. Se registra el ingreso.
3. Se registra el costo de las piezas vendidas.
4. Se calcula la ganancia estimada.
5. Se actualizan las estadísticas del día.

---

## Pedidos de WhatsApp

Los pedidos llegan principalmente por WhatsApp. La aplicación no debe intentar reemplazar WhatsApp; debe ordenar la información que normalmente se pierde entre mensajes.

Un pedido debe guardar:

- Cliente.
- Teléfono.
- Canal de venta: WhatsApp, patio, recomendación u otro.
- Productos solicitados.
- Cantidades.
- Precio individual o precio por docena.
- Subtotal.
- Descuento, si existe.
- Costo de envío, si se cobra.
- Total final.
- Anticipo.
- Saldo pendiente.
- Fecha de creación.
- Fecha y hora de entrega.
- Punto de entrega.
- Notas.
- Estado del pedido.

Estados recomendados:

```text
Pendiente
Anticipo recibido
En preparación
Listo para entregar
En camino
Entregado
Cancelado
No recogido
```

El pedido debe poder generar un texto para compartir manualmente por WhatsApp.

Ejemplo:

```text
Hola, Sra. María.

Le confirmamos su pedido:

- 1 docena de vasos de barro.
- 2 tazones grandes.

Subtotal: $740
Costo de entrega: $35
Total: $775
Anticipo recibido: $300
Saldo pendiente: $475

Entrega: sábado, 11:00 am.
Punto acordado: Metro Ecatepec.

Gracias por su compra.
```

---

## Apartados y anticipos

Los pedidos grandes, personalizados o por docena deben poder requerir anticipo.

Reglas sugeridas:

- Un pedido no debe considerarse totalmente confirmado hasta que exista un anticipo.
- Un producto puede quedar apartado al recibir anticipo.
- Los productos apartados deben reflejarse como no disponibles para vender a otro cliente.
- El pedido debe mostrar claramente el saldo restante.
- El sistema debe avisar de pagos pendientes.
- Un apartado puede tener una fecha límite, por ejemplo 24 o 48 horas.

Estados de pago sugeridos:

```text
Sin pago
Anticipo recibido
Pago parcial
Pagado
Reembolsado
```

---

## Entregas

El negocio realiza entregas en puntos acordados con clientes, principalmente en Ecatepec u otras zonas cercanas.

Cada entrega debe registrar:

- Pedido relacionado.
- Fecha y hora.
- Punto de entrega.
- Colonia o zona.
- Referencia adicional.
- Persona responsable de entregar.
- Costo real de pasaje.
- Costo de empaque.
- Otros gastos.
- Estado de entrega.

Estados de entrega:

```text
Pendiente
Programada
En camino
Entregada
No entregada
Cancelada
```

El costo de transporte no debe salir ocultamente de la ganancia. La aplicación debe registrar el pasaje real de cada entrega.

Reglas comerciales sugeridas:

- La recolección en el patio puede ser gratuita.
- Las entregas pueden tener costo fijo según zona.
- Las entregas lejanas deben cotizarse.
- Los pedidos por docena pueden tener un mínimo para acceder a entrega.
- Se puede ofrecer envío gratis a partir de cierto monto.
- Las entregas cercanas pueden agruparse en un mismo día para ahorrar pasaje.

Ejemplo de desglose para el cliente:

```text
Docena de vasos: $500
Entrega en punto acordado: $35
Total: $535
```

---

## Precios y utilidad

La aplicación no debe decidir el precio de venta de forma obligatoria. La dueña establece el precio según la calidad, el mercado, la competencia y el valor que el cliente reconoce en la pieza.

Sin embargo, el sistema debe mostrar cuánto se gana con cada precio.

### Fórmula de ganancia por venta

```text
Ganancia bruta =
Precio de venta - Costo real de la pieza
```

### Fórmula de ganancia real por pedido

```text
Ganancia neta =
Total cobrado
- Costo de las piezas vendidas
- Pasaje de entrega
- Empaque de entrega
- Otros gastos relacionados
```

### Fórmula de margen

```text
Margen (%) =
((Precio de venta - Costo real) / Precio de venta) x 100
```

### Fórmula de precio sugerido con margen objetivo

```text
Precio sugerido =
Costo real / (1 - margen deseado)
```

Ejemplo:

```text
Costo real de un vaso: $27.79
Precio de venta: $45.00

Ganancia por vaso:
$45.00 - $27.79 = $17.21

Margen:
($17.21 / $45.00) x 100 = 38.2%
```

---

## Dashboard

El dashboard es la pantalla principal de la aplicación. Debe mostrar información útil y fácil de entender sin requerir conocimientos contables.

Información recomendada:

- Total vendido hoy.
- Ganancia estimada de hoy.
- Ventas de la semana.
- Ganancia neta de la semana.
- Pedidos pendientes de entregar.
- Pagos o saldos pendientes.
- Productos con stock bajo.
- Próximas entregas.
- Productos más vendidos.
- Valor actual del inventario.
- Inversión reciente en surtidos.

Ejemplo visual:

```text
Hola 👋

Ventas de hoy: $1,240
Ganancia estimada: $410
Pedidos por entregar: 3
Pagos pendientes: $650

Productos por terminarse:
- Vaso mediano: quedan 8
- Molcajete chico: quedan 2

Próximas entregas:
- Mañana, 11:00 am — Sra. María
  1 docena de vasos
  Punto: Metro Ecatepec
  Saldo: $475

Acciones rápidas:
[ Registrar venta ]
[ Nuevo pedido ]
[ Registrar surtido ]
[ Ver inventario ]
```

---

## Reportes

La aplicación debe permitir consultar reportes por día, semana y mes.

Reportes recomendados:

- Ventas totales.
- Ganancia bruta.
- Ganancia neta.
- Costo de piezas vendidas.
- Dinero invertido en surtidos.
- Gastos de pasaje a Puebla.
- Gastos de entregas.
- Gastos de empaques.
- Productos más vendidos.
- Productos con baja existencia.
- Pedidos pendientes.
- Clientes con saldo pendiente.
- Valor de inventario a costo.
- Valor de inventario a precio de venta.

Ejemplo de reporte semanal:

```text
Ventas cobradas: $7,240
Costo de piezas vendidas: $4,320
Pasajes de entrega: $280
Empaques: $110

Ganancia neta estimada: $2,530

Productos más vendidos:
1. Vasos de barro.
2. Tazones.
3. Ollas.

Productos por surtir:
- Vasos medianos.
- Molcajetes chicos.
```

---

## Modelo de datos sugerido

## Usuarios

```text
users
- id
- name
- email
- password_hash
- role
- created_at
- updated_at
```

Roles posibles:

```text
admin
vendedora
familia
```

---

## Categorías

```text
categories
- id
- name
- description
- created_at
- updated_at
```

---

## Productos del modelo

```text
products
- id
- category_id
- name
- description
- image_url
- sale_price
- dozen_price
- minimum_stock
- active
- created_at
- updated_at
```

Nota: el stock no debe depender únicamente de un campo manual. Debe poder calcularse a partir de movimientos de inventario o mantenerse sincronizado mediante transacciones.

---

## Proveedores

```text
suppliers
- id
- name
- city
- phone
- notes
- created_at
- updated_at
```

Ejemplo:

```text
Nombre: Proveedor de barro Puebla
Ciudad: Puebla
Teléfono: opcional
Notas: tipos de piezas, precios habituales, fechas de surtido
```

---

## Surtidos o compras

```text
purchases
- id
- supplier_id
- purchase_date
- transport_cost
- loading_cost
- packaging_cost
- food_cost
- other_cost
- total_merchandise_cost
- total_extra_cost
- total_investment
- notes
- created_at
- updated_at
```

---

## Detalle de surtidos

```text
purchase_details
- id
- purchase_id
- product_id
- quantity
- supplier_unit_cost
- allocated_extra_cost
- real_unit_cost
- remaining_quantity
- created_at
- updated_at
```

`remaining_quantity` permite saber cuántas piezas quedan de cada lote comprado.

---

## Movimientos de inventario

```text
inventory_movements
- id
- product_id
- purchase_detail_id nullable
- movement_type
- quantity
- movement_date
- reference_type
- reference_id
- notes
- created_at
```

Tipos de movimiento:

```text
purchase_entry
patio_sale
order_reserved
order_sale
return
adjustment
waste
```

---

## Clientes

```text
customers
- id
- name
- phone
- neighborhood
- frequent_delivery_point
- notes
- created_at
- updated_at
```

---

## Pedidos

```text
orders
- id
- customer_id
- order_type
- status
- subtotal
- discount
- delivery_fee
- delivery_transport_cost
- delivery_packaging_cost
- other_delivery_cost
- total
- deposit
- pending_balance
- net_profit
- order_date
- delivery_date
- delivery_time
- delivery_point
- notes
- created_at
- updated_at
```

Tipos de pedido:

```text
whatsapp
patio
delivery
pickup
```

Estados de pedido:

```text
pending
deposit_received
preparing
ready
on_the_way
delivered
cancelled
not_collected
```

---

## Detalles de pedido

```text
order_details
- id
- order_id
- product_id
- purchase_detail_id nullable
- quantity
- unit_sale_price
- unit_cost_at_sale
- subtotal
- created_at
```

`unit_cost_at_sale` debe guardarse al momento de vender. Esto permite conservar la ganancia histórica aunque el proveedor suba los precios en surtidos futuros.

---

## Pagos

```text
payments
- id
- order_id nullable
- sale_id nullable
- amount
- payment_method
- payment_date
- notes
- created_at
```

Métodos de pago:

```text
cash
transfer
deposit
other
```

---

## Gastos

```text
expenses
- id
- expense_type
- amount
- expense_date
- purchase_id nullable
- order_id nullable
- description
- created_at
```

Tipos de gasto:

```text
puebla_transport
local_delivery_transport
loading
packaging
food
repair
other
```

---

## Endpoints sugeridos para la API

## Dashboard de la API

```text
GET /dashboard
```

Debe devolver:

- Ventas del día.
- Ganancia estimada del día.
- Pedidos pendientes de entregar.
- Saldos pendientes.
- Productos con stock bajo.
- Próximas entregas.
- Resumen semanal.

Ejemplo de respuesta:

```json
{
  "salesToday": 1240,
  "estimatedProfitToday": 410,
  "ordersPendingDelivery": 3,
  "pendingPayments": 650,
  "lowStockProducts": [
    {
      "id": "product-01",
      "name": "Vaso mediano",
      "currentStock": 8,
      "minimumStock": 20
    }
  ],
  "upcomingDeliveries": [
    {
      "orderId": "order-21",
      "customerName": "Sra. María",
      "deliveryDate": "2026-09-15",
      "deliveryPoint": "Metro Ecatepec",
      "pendingBalance": 475
    }
  ]
}
```

---

## Productos (API)

```text
GET /products
GET /products/:id
POST /products
PATCH /products/:id
DELETE /products/:id
```

---

## Inventario (API)

```text
GET /inventory
GET /inventory/movements
GET /inventory/low-stock
POST /inventory/adjustments
```

---

## Proveedores y surtidos

```text
GET /suppliers
POST /suppliers
PATCH /suppliers/:id

GET /purchases
GET /purchases/:id
POST /purchases
```

`POST /purchases` debe crear el surtido, sus detalles, los movimientos de inventario y los gastos asociados dentro de una transacción de base de datos.

---

## Clientes (API)

```text
GET /customers
GET /customers/:id
POST /customers
PATCH /customers/:id
```

---

## Ventas en patio (API)

```text
GET /sales
POST /sales
GET /sales/:id
```

`POST /sales` debe descontar inventario y guardar el costo real de los productos vendidos.

---

## Pedidos del sistema (API)

```text
GET /orders
GET /orders/:id
POST /orders
PATCH /orders/:id
PATCH /orders/:id/status
POST /orders/:id/payments
POST /orders/:id/delivery
```

Filtros sugeridos:

```text
GET /orders?status=pending
GET /orders?status=ready
GET /orders?deliveryDate=2026-09-15
GET /orders?customerId=...
```

---

## Reportes (API)

```text
GET /reports/daily
GET /reports/weekly
GET /reports/monthly
GET /reports/products/best-sellers
GET /reports/profitability
```

---

## Reglas técnicas importantes

## Transacciones

Las operaciones que modifican dinero e inventario deben ejecutarse usando transacciones de base de datos.

Ejemplos:

- Registrar un surtido.
- Registrar una venta.
- Crear un pedido que aparta productos.
- Confirmar una entrega.
- Cancelar un pedido y devolver inventario.
- Registrar un pago.

Esto evita errores como descontar inventario sin guardar la venta o registrar un pedido incompleto.

---

## Costos por lote

Los productos pueden cambiar de precio entre un surtido y otro. Por eso se debe guardar el costo por lote en `purchase_details`.

Ejemplo:

```text
Primer surtido:
Vaso mediano: 60 piezas a $16.

Segundo surtido:
Vaso mediano: 60 piezas a $20.
```

La aplicación debe conservar el costo original de cada pieza vendida.

Para una primera versión se recomienda usar FIFO:

```text
First In, First Out.
Las primeras piezas que entraron al inventario son las primeras que se consideran vendidas.
```

Esto ayuda a calcular correctamente la utilidad cuando cambian los precios de los proveedores.

---

## No modificar ventas históricas

Cuando cambia el precio de un producto, no se deben modificar ventas antiguas.

Cada detalle de venta o pedido debe guardar:

- Precio de venta aplicado en ese momento.
- Costo unitario aplicado en ese momento.
- Cantidad.
- Subtotal.

De esta forma, los reportes históricos siguen siendo correctos.

---

## Experiencia de usuario

La aplicación está diseñada para un negocio pequeño y familiar. Debe priorizar:

- Botones grandes.
- Pocos pasos por operación.
- Formularios claros.
- Lenguaje sencillo.
- Uso desde celular.
- Colores fáciles de distinguir.
- Confirmaciones antes de borrar o cancelar.
- Funcionar bien con internet lento.
- Posibilidad futura de modo offline y sincronización.
- Evitar términos contables complejos en pantallas de uso diario.

Ejemplos de textos amigables:

```text
En lugar de: "Costo de bienes vendidos"
Usar: "Costo de las piezas vendidas"

En lugar de: "Cuentas por cobrar"
Usar: "Dinero pendiente por cobrar"

En lugar de: "Stock crítico"
Usar: "Productos por terminarse"

En lugar de: "Utilidad neta"
Usar: "Ganancia real"
```

---

## MVP: primera versión funcional

La primera versión debe enfocarse únicamente en resolver los problemas diarios más importantes.

## Funciones obligatorias

1. Crear, editar y desactivar productos.
2. Registrar surtidos comprados en Puebla.
3. Registrar precio de proveedor y gastos del surtido.
4. Aumentar inventario automáticamente al registrar un surtido.
5. Consultar stock disponible por producto.
6. Registrar ventas rápidas en patio.
7. Descontar stock automáticamente al vender.
8. Crear pedidos de WhatsApp.
9. Vender productos por unidad o por docena.
10. Registrar anticipos y saldos pendientes.
11. Registrar fecha y punto de entrega.
12. Registrar pasaje y empaque de cada entrega.
13. Mostrar ganancia estimada por venta y pedido.
14. Mostrar dashboard con ventas, pedidos y productos con stock bajo.
15. Generar reportes básicos de semana y mes.

## Funciones para versiones posteriores

- Fotos de productos.
- Catálogo para clientes.
- Integración formal con WhatsApp Business API.
- Mensajes automáticos.
- Mapas y cálculo automático de rutas.
- Costos de envío por zonas.
- Notificaciones.
- Código QR o tickets.
- Exportar PDF y Excel.
- Varios usuarios con distintos permisos.
- Modo sin conexión.
- Panel administrativo web.
- Estadísticas avanzadas.
- Pronóstico de productos por surtir.

---

## Orden recomendado de desarrollo

## Sprint 1: Base del sistema

- Configurar PostgreSQL.
- Configurar Bun + TypeScript.
- Crear migraciones y modelo de datos inicial.
- Crear autenticación básica.
- Crear categorías y productos.
- Crear inventario básico.
- Crear pantalla de productos en Flutter.
- Crear pantalla de inventario en Flutter.

## Sprint 2: Surtidos desde Puebla

- Crear proveedores.
- Crear surtidos.
- Crear detalles de surtido.
- Registrar gastos de surtido.
- Calcular inversión total.
- Generar entradas de inventario.
- Mostrar historial de surtidos.

## Sprint 3: Ventas y dashboard

- Registrar venta en patio.
- Descontar inventario.
- Guardar pagos.
- Calcular ganancia básica.
- Implementar dashboard.
- Mostrar ventas del día y productos por terminarse.

## Sprint 4: Pedidos y entregas

- Crear clientes.
- Crear pedidos.
- Permitir productos por pieza y por docena.
- Registrar anticipo.
- Registrar saldo pendiente.
- Implementar estados de pedido.
- Registrar punto y fecha de entrega.
- Registrar costo de pasaje local.
- Compartir texto de confirmación a WhatsApp.

## Sprint 5: Reportes y mejoras

- Reporte diario, semanal y mensual.
- Productos más vendidos.
- Ganancia por producto.
- Gastos por categoría.
- Clientes con saldo pendiente.
- Alertas de stock bajo.
- Exportación de reportes.

---

## Criterio de éxito

La aplicación será útil si permite que la dueña responda rápidamente estas preguntas:

- ¿Cuántos vasos, tazones, ollas y molcajetes quedan?
- ¿Cuánto dinero se invirtió en el último surtido de Puebla?
- ¿Cuánto dinero se vendió hoy, esta semana y este mes?
- ¿Qué piezas se están acabando?
- ¿Qué pedidos están pendientes?
- ¿Quién debe dinero todavía?
- ¿Qué entregas hay mañana?
- ¿Cuánto costó entregar cada pedido?
- ¿Cuánto se ganó realmente después de comprar, transportar y entregar las piezas?
- ¿Qué productos se deben volver a comprar en Puebla?

---

## Instrucciones para asistentes de IA

Al trabajar en este proyecto, cualquier asistente de IA debe seguir estas prioridades:

1. Priorizar simplicidad y rapidez de uso sobre funciones complejas.
2. Mantener una arquitectura separada entre la aplicación Flutter y la API con Bun.
3. Proteger la integridad de inventario, pagos y costos con transacciones.
4. No tratar el precio del proveedor como el único costo: considerar gastos de surtido desde Puebla.
5. Diferenciar entre precio de venta, costo de compra y costo real.
6. Registrar siempre costos históricos en ventas y pedidos.
7. Permitir ventas por unidad y por docena, pero controlar inventario por unidades.
8. Considerar pasaje, empaque y otros gastos de entrega al calcular ganancia.
9. No descontar productos de forma incorrecta en pedidos cancelados.
10. Usar lenguaje claro y amigable para personas no técnicas.
11. Construir primero el MVP antes de agregar integración con WhatsApp, mapas, pagos en línea o funciones avanzadas.
12. Evitar sobreingeniería; cada pantalla debe resolver una necesidad real del negocio.
