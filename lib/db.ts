import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL!)

// ─── Employees ───────────────────────────────────────────────────────────────

export async function getEmployee(vkId: number) {
  const rows = await sql`SELECT * FROM employees WHERE vk_id = ${vkId}`
  return rows[0] ?? null
}

export async function createEmployee(vkId: number, nick: string, bankAccount: string) {
  const rows = await sql`
    INSERT INTO employees (vk_id, nick, bank_account)
    VALUES (${vkId}, ${nick}, ${bankAccount})
    ON CONFLICT (vk_id) DO UPDATE SET nick = EXCLUDED.nick, bank_account = EXCLUDED.bank_account
    RETURNING *
  `
  return rows[0]
}

export async function setEmployeePasswordHash(vkId: number, hash: string) {
  await sql`UPDATE employees SET password_hash = ${hash} WHERE vk_id = ${vkId}`
}

export async function getAllEmployees() {
  return sql`SELECT * FROM employees ORDER BY registered_at DESC`
}

export async function getEmployeeByNick(nick: string) {
  const rows = await sql`SELECT * FROM employees WHERE nick ILIKE ${nick}`
  return rows[0] ?? null
}

// ─── Employee Cars ────────────────────────────────────────────────────────────

export async function getEmployeeCars(vkId: number) {
  return sql`
    SELECT ec.*, c.name AS car_name, c.photo_attachment AS car_photo, c.is_org_car
    FROM employee_cars ec
    JOIN cars c ON c.id = ec.car_id
    WHERE ec.employee_vk_id = ${vkId} AND ec.is_active = true
  `
}

export async function addEmployeeCar(
  vkId: number,
  carId: number,
  isPersonal: boolean,
  isBranded: boolean,
  photo?: string | null
) {
  const rows = await sql`
    INSERT INTO employee_cars (employee_vk_id, car_id, is_personal, is_branded, photo_attachment)
    VALUES (${vkId}, ${carId}, ${isPersonal}, ${isBranded}, ${photo ?? null})
    RETURNING *
  `
  return rows[0]
}

// ─── Cars catalog ─────────────────────────────────────────────────────────────

export async function getAllCars() {
  return sql`SELECT * FROM cars ORDER BY name`
}

export async function getOrgCars() {
  return sql`SELECT * FROM cars WHERE is_org_car = true ORDER BY name`
}

export async function addCar(name: string, photoAttachment: string | null, isOrgCar: boolean, addedBy: number) {
  const rows = await sql`
    INSERT INTO cars (name, photo_attachment, is_org_car, added_by)
    VALUES (${name}, ${photoAttachment}, ${isOrgCar}, ${addedBy})
    RETURNING *
  `
  return rows[0]
}

// ─── Product Categories ───────────────────────────────────────────────────────

export async function getProductCategories() {
  return sql`SELECT * FROM product_categories WHERE is_active = true ORDER BY sort_order, name`
}

export async function addProductCategory(name: string, photo: string | null, addedBy: number) {
  const rows = await sql`
    INSERT INTO product_categories (name, photo_attachment, added_by) VALUES (${name}, ${photo}, ${addedBy}) RETURNING *
  `
  return rows[0]
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProductsByCategory(categoryId: number) {
  return sql`SELECT * FROM products WHERE category_id = ${categoryId} AND is_active = true ORDER BY name`
}

export async function getProductById(id: number) {
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`
  return rows[0] ?? null
}

export async function addProduct(
  categoryId: number,
  name: string,
  price: number,
  costPrice: number,
  unit: string | null,
  simpleIngredients: object[],
  instructionPhoto: string | null,
  addedBy: number
) {
  const rows = await sql`
    INSERT INTO products (category_id, name, price, cost_price, unit, simple_ingredients, instruction_photo, added_by)
    VALUES (${categoryId}, ${name}, ${price}, ${costPrice}, ${unit}, ${JSON.stringify(simpleIngredients)}, ${instructionPhoto}, ${addedBy})
    RETURNING *
  `
  return rows[0]
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function getAllSets() {
  return sql`SELECT * FROM sets WHERE is_active = true ORDER BY name`
}

export async function getSetById(id: number) {
  const rows = await sql`SELECT * FROM sets WHERE id = ${id}`
  return rows[0] ?? null
}

export async function addSet(name: string, price: number, costPrice: number, items: object[], addedBy: number) {
  const rows = await sql`
    INSERT INTO sets (name, price, cost_price, items, added_by)
    VALUES (${name}, ${price}, ${costPrice}, ${JSON.stringify(items)}, ${addedBy})
    RETURNING *
  `
  return rows[0]
}

// ─── Order Sessions ────────────────────────────────────────────────────────────

export async function getOrderSession(clientVkId: number) {
  const rows = await sql`SELECT * FROM order_sessions WHERE client_vk_id = ${clientVkId}`
  return rows[0] ?? null
}

export async function upsertOrderSession(clientVkId: number, cart: object[], step: string, editMessageId?: number | null) {
  const rows = await sql`
    INSERT INTO order_sessions (client_vk_id, cart, step, edit_message_id, updated_at)
    VALUES (${clientVkId}, ${JSON.stringify(cart)}, ${step}, ${editMessageId ?? null}, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
    ON CONFLICT (client_vk_id) DO UPDATE SET
      cart = EXCLUDED.cart,
      step = EXCLUDED.step,
      edit_message_id = EXCLUDED.edit_message_id,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `
  return rows[0]
}

export async function deleteOrderSession(clientVkId: number) {
  await sql`DELETE FROM order_sessions WHERE client_vk_id = ${clientVkId}`
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  clientVkId: number,
  clientNick: string,
  deliveryAddress: string,
  cart: object[],
  total: number
) {
  const rows = await sql`
    INSERT INTO orders (client_vk_id, client_nick, delivery_address, cart, total)
    VALUES (${clientVkId}, ${clientNick}, ${deliveryAddress}, ${JSON.stringify(cart)}, ${total})
    RETURNING *
  `
  return rows[0]
}

export async function getOrderById(id: number) {
  const rows = await sql`SELECT * FROM orders WHERE id = ${id}`
  return rows[0] ?? null
}

export async function updateOrderStatus(id: number, status: string) {
  await sql`UPDATE orders SET status = ${status}, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE id = ${id}`
}

export async function assignCourier(orderId: number, courierVkId: number, courierNick: string, estimatedTime: string) {
  await sql`
    UPDATE orders SET
      courier_vk_id = ${courierVkId},
      courier_nick = ${courierNick},
      estimated_time = ${estimatedTime},
      status = 'accepted',
      updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
    WHERE id = ${orderId}
  `
}

export async function getActiveOrdersForCourier(courierVkId: number) {
  return sql`SELECT * FROM orders WHERE courier_vk_id = ${courierVkId} AND status NOT IN ('completed', 'cancelled')`
}

export async function getOrdersByDateRange(from: number, to: number) {
  return sql`SELECT * FROM orders WHERE created_at >= ${from} AND created_at <= ${to} ORDER BY created_at DESC`
}

// ─── Courier Purchase Progress ─────────────────────────────────────────────────

export async function getCourierProgress(orderId: number, courierVkId: number) {
  const rows = await sql`
    SELECT * FROM courier_purchase_progress WHERE order_id = ${orderId} AND courier_vk_id = ${courierVkId}
  `
  return rows[0] ?? null
}

export async function upsertCourierProgress(
  orderId: number,
  courierVkId: number,
  purchaseList: object[],
  progressMessageId?: number | null
) {
  const rows = await sql`
    INSERT INTO courier_purchase_progress (order_id, courier_vk_id, purchase_list, progress_message_id, updated_at)
    VALUES (${orderId}, ${courierVkId}, ${JSON.stringify(purchaseList)}, ${progressMessageId ?? null}, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
    ON CONFLICT (order_id, courier_vk_id) DO UPDATE SET
      purchase_list = EXCLUDED.purchase_list,
      progress_message_id = EXCLUDED.progress_message_id,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `
  return rows[0]
}

// ─── Online Status ─────────────────────────────────────────────────────────────

export async function getAllOnline() {
  return sql`SELECT * FROM online_status WHERE status != 'offline' ORDER BY online_since ASC`
}

export async function setOnlineStatus(vkId: number, nick: string, role: string, status: string, statusText: string) {
  const onlineSince = status === 'online' ? `EXTRACT(EPOCH FROM NOW())::BIGINT * 1000` : null
  await sql`
    INSERT INTO online_status (vk_id, nick, role, status, status_text, last_seen, online_since)
    VALUES (
      ${vkId}, ${nick}, ${role}, ${status}, ${statusText},
      EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
      CASE WHEN ${status} = 'online' THEN EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 ELSE NULL END
    )
    ON CONFLICT (vk_id) DO UPDATE SET
      nick = EXCLUDED.nick,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      status_text = EXCLUDED.status_text,
      last_seen = EXCLUDED.last_seen,
      online_since = CASE WHEN EXCLUDED.status = 'online' AND online_status.status != 'online'
        THEN EXCLUDED.online_since ELSE online_status.online_since END
  `
}

export async function logOnlineEvent(
  vkId: number, nick: string, role: string, peerId: number,
  status: string, statusText: string, event: string
) {
  await sql`
    INSERT INTO online_journal (vk_id, nick, role, peer_id, status, status_text, event)
    VALUES (${vkId}, ${nick}, ${role}, ${peerId}, ${status}, ${statusText}, ${event})
  `
}

export async function getOnlineStatsByVkId(vkId: number, fromTs: number) {
  return sql`
    SELECT * FROM online_journal WHERE vk_id = ${vkId} AND created_at >= ${fromTs} ORDER BY created_at ASC
  `
}

// ─── Taxi Locations ───────────────────────────────────────────────────────────

export async function getTaxiCities() {
  return sql`SELECT DISTINCT city FROM taxi_locations WHERE is_active = true ORDER BY city`
}

export async function getTaxiCategories() {
  return sql`SELECT * FROM taxi_location_categories ORDER BY name`
}

export async function getTaxiLocationsByCity(city: string) {
  return sql`SELECT * FROM taxi_locations WHERE city = ${city} AND is_active = true ORDER BY category, name`
}

export async function getTaxiLocationById(id: number) {
  const rows = await sql`SELECT * FROM taxi_locations WHERE id = ${id}`
  return rows[0] ?? null
}

export async function addTaxiLocation(
  name: string, city: string, category: string,
  lat: number | null, lng: number | null, addedBy: number
) {
  const rows = await sql`
    INSERT INTO taxi_locations (name, city, category, lat, lng, added_by)
    VALUES (${name}, ${city}, ${category}, ${lat}, ${lng}, ${addedBy})
    RETURNING *
  `
  return rows[0]
}

// ─── Taxi Order Sessions ───────────────────────────────────────────────────────

export async function getTaxiOrderSession(clientVkId: number) {
  const rows = await sql`SELECT * FROM taxi_order_sessions WHERE client_vk_id = ${clientVkId}`
  return rows[0] ?? null
}

export async function upsertTaxiOrderSession(
  clientVkId: number,
  step: string,
  companions: string[],
  fromLocationId: number | null,
  toLocationId: number | null,
  promoCode: string | null,
  paymentType: string | null,
  editMessageId: number | null
) {
  const rows = await sql`
    INSERT INTO taxi_order_sessions (client_vk_id, step, companions, from_location_id, to_location_id, promo_code, payment_type, edit_message_id, updated_at)
    VALUES (${clientVkId}, ${step}, ${JSON.stringify(companions)}, ${fromLocationId}, ${toLocationId}, ${promoCode}, ${paymentType}, ${editMessageId}, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
    ON CONFLICT (client_vk_id) DO UPDATE SET
      step = EXCLUDED.step,
      companions = EXCLUDED.companions,
      from_location_id = EXCLUDED.from_location_id,
      to_location_id = EXCLUDED.to_location_id,
      promo_code = EXCLUDED.promo_code,
      payment_type = EXCLUDED.payment_type,
      edit_message_id = EXCLUDED.edit_message_id,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `
  return rows[0]
}

export async function deleteTaxiOrderSession(clientVkId: number) {
  await sql`DELETE FROM taxi_order_sessions WHERE client_vk_id = ${clientVkId}`
}

// ─── Taxi Orders ───────────────────────────────────────────────────────────────

export async function createTaxiOrder(data: {
  clientVkId: number
  clientNick: string
  companions: string[]
  fromLocationId: number | null
  toLocationId: number | null
  fromName: string
  toName: string
  promoCode: string | null
  discountPercent: number
  paymentType: string
  basePrice: number | null
  finalPrice: number | null
}) {
  const rows = await sql`
    INSERT INTO taxi_orders (
      client_vk_id, client_nick, companions,
      from_location_id, to_location_id, from_name, to_name,
      promo_code, discount_percent, payment_type, base_price, final_price
    ) VALUES (
      ${data.clientVkId}, ${data.clientNick}, ${JSON.stringify(data.companions)},
      ${data.fromLocationId}, ${data.toLocationId}, ${data.fromName}, ${data.toName},
      ${data.promoCode}, ${data.discountPercent}, ${data.paymentType}, ${data.basePrice}, ${data.finalPrice}
    ) RETURNING *
  `
  return rows[0]
}

export async function getTaxiOrderById(id: number) {
  const rows = await sql`SELECT * FROM taxi_orders WHERE id = ${id}`
  return rows[0] ?? null
}

export async function updateTaxiOrderStatus(id: number, status: string) {
  await sql`UPDATE taxi_orders SET status = ${status}, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE id = ${id}`
}

export async function assignDriver(taxiOrderId: number, driverVkId: number, driverNick: string, estimatedTime: string) {
  await sql`
    UPDATE taxi_orders SET
      driver_vk_id = ${driverVkId},
      driver_nick = ${driverNick},
      estimated_time = ${estimatedTime},
      status = 'accepted',
      updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
    WHERE id = ${taxiOrderId}
  `
}

// ─── Promo Codes ──────────────────────────────────────────────────────────────

export async function getPromoCode(code: string) {
  const rows = await sql`
    SELECT * FROM promo_codes
    WHERE code = ${code.toUpperCase()}
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
      AND (max_uses IS NULL OR used_count < max_uses)
  `
  return rows[0] ?? null
}

export async function usePromoCode(code: string) {
  await sql`UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ${code.toUpperCase()}`
}

export async function createPromoCode(
  code: string, discountPercent: number, maxUses: number | null,
  expiresAt: number | null, createdBy: number
) {
  const rows = await sql`
    INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at, created_by)
    VALUES (${code.toUpperCase()}, ${discountPercent}, ${maxUses}, ${expiresAt}, ${createdBy})
    RETURNING *
  `
  return rows[0]
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function saveDailyReport(data: {
  reportDate: string
  ordersCount: number
  totalRevenue: number
  courierPayouts: object[]
  reportMessageId: number
}) {
  const rows = await sql`
    INSERT INTO daily_reports (report_date, orders_count, total_revenue, courier_payouts, report_message_id)
    VALUES (${data.reportDate}, ${data.ordersCount}, ${data.totalRevenue}, ${JSON.stringify(data.courierPayouts)}, ${data.reportMessageId})
    ON CONFLICT (report_date) DO UPDATE SET
      orders_count = EXCLUDED.orders_count,
      total_revenue = EXCLUDED.total_revenue,
      courier_payouts = EXCLUDED.courier_payouts,
      report_message_id = EXCLUDED.report_message_id
    RETURNING *
  `
  return rows[0]
}

export async function markDailyReportProcessed(reportDate: string) {
  await sql`UPDATE daily_reports SET is_processed = true WHERE report_date = ${reportDate}`
}

export async function saveWeeklyReport(data: {
  weekStart: string
  weekEnd: string
  ordersCount: number
  totalRevenue: number
  totalCost: number
  netIncome: number
  salaryPayouts: object[]
  reportMessageId: number
}) {
  const rows = await sql`
    INSERT INTO weekly_reports (week_start, week_end, orders_count, total_revenue, total_cost, net_income, salary_payouts, report_message_id)
    VALUES (${data.weekStart}, ${data.weekEnd}, ${data.ordersCount}, ${data.totalRevenue}, ${data.totalCost}, ${data.netIncome}, ${JSON.stringify(data.salaryPayouts)}, ${data.reportMessageId})
    ON CONFLICT (week_start) DO UPDATE SET
      orders_count = EXCLUDED.orders_count,
      total_revenue = EXCLUDED.total_revenue,
      total_cost = EXCLUDED.total_cost,
      net_income = EXCLUDED.net_income,
      salary_payouts = EXCLUDED.salary_payouts,
      report_message_id = EXCLUDED.report_message_id
    RETURNING *
  `
  return rows[0]
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export async function saveChatMessage(
  peerId: number, peerName: string | null,
  senderVkId: number, senderNick: string | null,
  messageId: number | null, text: string, attachments: object[]
) {
  await sql`
    INSERT INTO chat_history (peer_id, peer_name, sender_vk_id, sender_nick, message_id, text, attachments)
    VALUES (${peerId}, ${peerName}, ${senderVkId}, ${senderNick}, ${messageId}, ${text}, ${JSON.stringify(attachments)})
  `
}

export async function getChatHistory(peerId: number, limit = 100, offset = 0) {
  return sql`
    SELECT * FROM chat_history WHERE peer_id = ${peerId}
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `
}

// ─── VK Link Requests ─────────────────────────────────────────────────────────

export async function createLinkRequest(
  orderId: number, orderType: string,
  requesterVkId: number, requesterType: string, targetVkId: number
) {
  const rows = await sql`
    INSERT INTO vk_link_requests (order_id, order_type, requester_vk_id, requester_type, target_vk_id)
    VALUES (${orderId}, ${orderType}, ${requesterVkId}, ${requesterType}, ${targetVkId})
    RETURNING *
  `
  return rows[0]
}

export async function updateLinkRequestStatus(id: number, status: string) {
  await sql`UPDATE vk_link_requests SET status = ${status} WHERE id = ${id}`
}

export async function getPendingLinkRequest(targetVkId: number) {
  const rows = await sql`
    SELECT * FROM vk_link_requests WHERE target_vk_id = ${targetVkId} AND status = 'pending' ORDER BY created_at DESC LIMIT 1
  `
  return rows[0] ?? null
}

// ─── Employee Stats ────────────────────────────────────────────────────────────

export async function incrementDeliveryCount(vkId: number) {
  await sql`
    INSERT INTO employee_stats (vk_id, delivery_orders_total)
    VALUES (${vkId}, 1)
    ON CONFLICT (vk_id) DO UPDATE SET
      delivery_orders_total = employee_stats.delivery_orders_total + 1,
      updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
  `
}

export async function incrementTaxiCount(vkId: number) {
  await sql`
    INSERT INTO employee_stats (vk_id, taxi_orders_total)
    VALUES (${vkId}, 1)
    ON CONFLICT (vk_id) DO UPDATE SET
      taxi_orders_total = employee_stats.taxi_orders_total + 1,
      updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
  `
}

export async function getEmployeeStats(vkId: number) {
  const rows = await sql`SELECT * FROM employee_stats WHERE vk_id = ${vkId}`
  return rows[0] ?? null
}
