import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('seller'),
    active: boolean('active').notNull().default(true),
    tokenVersion: integer('token_version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('users_role_idx').on(table.role), index('users_active_idx').on(table.active)],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('categories_active_idx').on(table.active)],
)

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('suppliers_active_idx').on(table.active)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    costPriceCents: integer('cost_price_cents').notNull().default(0),
    salePriceCents: integer('sale_price_cents').notNull().default(0),
    dozenPriceCents: integer('dozen_price_cents'),
    minimumStock: integer('minimum_stock').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('products_category_id_idx').on(table.categoryId),
    index('products_active_idx').on(table.active),
    index('products_name_idx').on(table.name),
  ],
)

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
    purchaseDate: timestamp('purchase_date', { withTimezone: true }).notNull(),
    transportCostCents: integer('transport_cost_cents').notNull().default(0),
    loadingCostCents: integer('loading_cost_cents').notNull().default(0),
    packagingCostCents: integer('packaging_cost_cents').notNull().default(0),
    foodCostCents: integer('food_cost_cents').notNull().default(0),
    otherCostCents: integer('other_cost_cents').notNull().default(0),
    merchandiseTotalCents: integer('merchandise_total_cents').notNull().default(0),
    extraCostTotalCents: integer('extra_cost_total_cents').notNull().default(0),
    totalInvestmentCents: integer('total_investment_cents').notNull().default(0),
    notes: text('notes'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('purchases_supplier_id_idx').on(table.supplierId),
    index('purchases_purchase_date_idx').on(table.purchaseDate),
    check('purchases_costs_non_negative_check', sql`${table.transportCostCents} >= 0 AND ${table.loadingCostCents} >= 0 AND ${table.packagingCostCents} >= 0 AND ${table.foodCostCents} >= 0 AND ${table.otherCostCents} >= 0`),
    check('purchases_totals_non_negative_check', sql`${table.merchandiseTotalCents} >= 0 AND ${table.extraCostTotalCents} >= 0 AND ${table.totalInvestmentCents} >= 0`),
  ],
)

export const purchaseDetails = pgTable(
  'purchase_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    quantityReceived: integer('quantity_received').notNull(),
    quantityRemaining: integer('quantity_remaining').notNull(),
    supplierUnitCostCents: integer('supplier_unit_cost_cents').notNull(),
    allocatedExtraCostCents: integer('allocated_extra_cost_cents').notNull().default(0),
    realUnitCostCents: integer('real_unit_cost_cents').notNull(),
    costRemainingCents: integer('cost_remaining_cents').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('purchase_details_purchase_id_idx').on(table.purchaseId),
    index('purchase_details_product_id_idx').on(table.productId),
    index('purchase_details_product_created_idx').on(table.productId, table.createdAt),
    check('purchase_details_quantities_positive_check', sql`${table.quantityReceived} > 0 AND ${table.quantityRemaining} >= 0 AND ${table.quantityRemaining} <= ${table.quantityReceived}`),
    check('purchase_details_costs_non_negative_check', sql`${table.supplierUnitCostCents} >= 0 AND ${table.allocatedExtraCostCents} >= 0 AND ${table.realUnitCostCents} >= 0`),
  ],
)

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id),
    purchaseDetailId: uuid('purchase_detail_id').references(() => purchaseDetails.id, {
      onDelete: 'set null',
    }),
    movementType: varchar('movement_type', { length: 40 }).notNull(),
    quantity: integer('quantity').notNull(),
    movementDate: timestamp('movement_date', { withTimezone: true }).defaultNow().notNull(),
    referenceType: varchar('reference_type', { length: 40 }),
    referenceId: uuid('reference_id'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_movements_product_id_idx').on(table.productId),
    index('inventory_movements_type_idx').on(table.movementType),
    index('inventory_movements_created_at_idx').on(table.createdAt),
  ],
)

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    neighborhood: varchar('neighborhood', { length: 120 }),
    frequentDeliveryPoint: varchar('frequent_delivery_point', { length: 200 }),
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('customers_active_idx').on(table.active),
    index('customers_phone_idx').on(table.phone),
  ],
)

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleType: varchar('sale_type', { length: 20 }).notNull().default('patio'),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    totalCostCents: integer('total_cost_cents').notNull().default(0),
    grossProfitCents: integer('gross_profit_cents').notNull().default(0),
    saleStatus: varchar('sale_status', { length: 20 }).notNull().default('active'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),
    notes: text('notes'),
    soldAt: timestamp('sold_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('sales_sale_type_idx').on(table.saleType), index('sales_status_idx').on(table.saleStatus), index('sales_sold_at_idx').on(table.soldAt)],
)

export const saleDetails = pgTable(
  'sale_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    purchaseDetailId: uuid('purchase_detail_id').notNull().references(() => purchaseDetails.id),
    quantity: integer('quantity').notNull(),
    unitSalePriceCents: integer('unit_sale_price_cents').notNull(),
    unitCostAtSaleCents: integer('unit_cost_at_sale_cents').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    costTotalCents: integer('cost_total_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('sale_details_sale_id_idx').on(table.saleId)],
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').notNull().references(() => customers.id),
    orderChannel: varchar('order_channel', { length: 20 }).notNull().default('whatsapp'),
    orderStatus: varchar('order_status', { length: 20 }).notNull().default('pending'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('unpaid'),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    deliveryTransportCostCents: integer('delivery_transport_cost_cents').notNull().default(0),
    deliveryPackagingCostCents: integer('delivery_packaging_cost_cents').notNull().default(0),
    otherDeliveryCostCents: integer('other_delivery_cost_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    paidAmountCents: integer('paid_amount_cents').notNull().default(0),
    pendingBalanceCents: integer('pending_balance_cents').notNull().default(0),
    productCostTotalCents: integer('product_cost_total_cents').notNull().default(0),
    grossProfitCents: integer('gross_profit_cents').notNull().default(0),
    netProfitCents: integer('net_profit_cents').notNull().default(0),
    orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
    deliveryDate: timestamp('delivery_date', { withTimezone: true }),
    deliveryTime: varchar('delivery_time', { length: 20 }),
    deliveryPoint: text('delivery_point'),
    notes: text('notes'),
    reservationExpiresAt: timestamp('reservation_expires_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_status_idx').on(table.orderStatus),
    index('orders_payment_status_idx').on(table.paymentStatus),
    index('orders_delivery_date_idx').on(table.deliveryDate),
    index('orders_status_delivery_date_idx').on(table.orderStatus, table.deliveryDate),
  ],
)

export const orderDetails = pgTable(
  'order_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    purchaseDetailId: uuid('purchase_detail_id').references(() => purchaseDetails.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),
    unitSalePriceCents: integer('unit_sale_price_cents').notNull(),
    unitCostAtSaleCents: integer('unit_cost_at_sale_cents').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    costTotalCents: integer('cost_total_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('order_details_order_id_idx').on(table.orderId)],
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'set null' }),
    amountCents: integer('amount_cents').notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('active'),
    paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }),
    notes: text('notes'),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    correctionNote: text('correction_note'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('payments_order_id_idx').on(table.orderId),
    index('payments_sale_id_idx').on(table.saleId),
    index('payments_idempotency_key_idx').on(table.idempotencyKey),
    uniqueIndex('payments_idempotency_key_unique').on(table.idempotencyKey),
    check('payments_amount_by_status_check', sql`(${table.paymentStatus} = 'compensation' AND ${table.amountCents} < 0) OR (${table.paymentStatus} <> 'compensation' AND ${table.amountCents} > 0)`),
  ],
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    expenseType: varchar('expense_type', { length: 30 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    expenseDate: timestamp('expense_date', { withTimezone: true }).notNull(),
    purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    description: text('description'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('expenses_type_idx').on(table.expenseType),
    index('expenses_date_idx').on(table.expenseDate),
  ],
)
