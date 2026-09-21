# api-artesanias

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Operación

Los listados de productos, ventas, pedidos y surtidos aceptan `page` (desde 1) y `limit` (1 a 100), y responden con `items` y `pagination` (`page`, `limit`, `total`). El límite predeterminado es 20.

El rate limiting es deliberadamente en memoria y por IP: login y register/bootstrap permiten 10 intentos por 15 minutos, y los endpoints de pagos permiten 30 por 15 minutos. Cuando se excede responde `429` con `Retry-After`. Esta protección solo es válida para una instancia del proceso; con varias instancias se necesita un almacén compartido, que no se configura aquí.
