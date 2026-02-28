-- =============================================================================
-- NewVK-bot full schema v3
-- Covers: delivery orders, taxi, employees, cars, products, sets, categories,
--         promo codes, online journal, chat history, VK link requests, reports
-- =============================================================================

-- ── v1 base ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blacklist (
  user_id  BIGINT PRIMARY KEY,
  end_date BIGINT NOT NULL DEFAULT 0,
  reason   TEXT   NOT NULL DEFAULT 'Нарушение правил',
  banned_at BIGINT NOT NULL,
  banned_by BIGINT
);

CREATE TABLE IF NOT EXISTS mutes (
  user_id   BIGINT PRIMARY KEY,
  end_date  BIGINT NOT NULL,
  reason    TEXT   NOT NULL DEFAULT 'Нарушение правил',
  muted_at  BIGINT NOT NULL,
  muted_by  BIGINT
);

CREATE TABLE IF NOT EXISTS greetings (
  peer_id     BIGINT PRIMARY KEY,
  text        TEXT NOT NULL DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS users (
  vk_id      BIGINT PRIMARY KEY,
  first_name TEXT,
  last_name  TEXT,
  role       TEXT,
  joined_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Employees ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  vk_id         BIGINT NOT NULL UNIQUE,
  nick          TEXT   NOT NULL,
  bank_account  TEXT,
  password_hash TEXT,
  -- role: courier | senior | rc | admin
  role          TEXT   NOT NULL DEFAULT 'courier',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  registered_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Cars ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cars (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  photo_attachment TEXT,
  is_org_car       BOOLEAN NOT NULL DEFAULT false,
  added_by         BIGINT,
  added_at         BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE TABLE IF NOT EXISTS employee_cars (
  id               SERIAL PRIMARY KEY,
  employee_vk_id   BIGINT NOT NULL REFERENCES employees(vk_id) ON DELETE CASCADE,
  car_id           INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  is_personal      BOOLEAN NOT NULL DEFAULT true,
  -- is_branded = true → salary/income coefficients drop from 15%/0.15 to 10%/0.1
  is_branded       BOOLEAN NOT NULL DEFAULT false,
  photo_attachment TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  added_at         BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Product Catalog ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  photo_attachment TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  added_by         BIGINT,
  added_at         BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE TABLE IF NOT EXISTS products (
  id                  SERIAL PRIMARY KEY,
  category_id         INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  cost_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit                TEXT DEFAULT NULL,
  -- simple_ingredients: [{ name: string, qty: number }]
  simple_ingredients  JSONB NOT NULL DEFAULT '[]',
  instruction_photo   TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  added_by            BIGINT,
  added_at            BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- sets are combos: items = [{ product_id?, set_product_name, qty }]
CREATE TABLE IF NOT EXISTS sets (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  price      NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  items      JSONB NOT NULL DEFAULT '[]',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  added_by   BIGINT,
  added_at   BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Delivery Orders ───────────────────────────────────────────────────────────

-- cart item: { type: 'product'|'set', id, name, price, qty, unit?, ingredients? }
CREATE TABLE IF NOT EXISTS order_sessions (
  client_vk_id    BIGINT PRIMARY KEY,
  cart            JSONB NOT NULL DEFAULT '[]',
  step            TEXT  NOT NULL DEFAULT 'menu',
  edit_message_id INTEGER,
  updated_at      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- status: pending | accepted | preparing | delivering | completed | cancelled
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  client_vk_id        BIGINT NOT NULL,
  client_nick         TEXT   NOT NULL,
  delivery_address    TEXT   NOT NULL,
  cart                JSONB  NOT NULL DEFAULT '[]',
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              TEXT   NOT NULL DEFAULT 'pending',
  courier_vk_id       BIGINT,
  courier_nick        TEXT,
  estimated_time      TEXT,
  dispatch_message_id INTEGER,
  client_message_id   INTEGER,
  created_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  updated_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE INDEX IF NOT EXISTS idx_orders_client  ON orders(client_vk_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_vk_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);

-- purchase_list: [{ label: string, qty: number, done: boolean }]
CREATE TABLE IF NOT EXISTS courier_purchase_progress (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_vk_id       BIGINT NOT NULL,
  purchase_list       JSONB NOT NULL DEFAULT '[]',
  progress_message_id INTEGER,
  updated_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  UNIQUE (order_id, courier_vk_id)
);

-- ── Taxi Orders ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taxi_location_categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  added_by BIGINT,
  added_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE TABLE IF NOT EXISTS taxi_locations (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  city      TEXT NOT NULL,
  category  TEXT NOT NULL,
  lat       NUMERIC(10,7),
  lng       NUMERIC(10,7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by  BIGINT,
  added_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE TABLE IF NOT EXISTS taxi_order_sessions (
  client_vk_id     BIGINT PRIMARY KEY,
  step             TEXT  NOT NULL DEFAULT 'menu',
  companions       JSONB NOT NULL DEFAULT '[]',
  from_location_id INTEGER,
  to_location_id   INTEGER,
  promo_code       TEXT,
  payment_type     TEXT,
  edit_message_id  INTEGER,
  updated_at       BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- status: pending | accepted | waiting | delivering | completed | cancelled
CREATE TABLE IF NOT EXISTS taxi_orders (
  id                  SERIAL PRIMARY KEY,
  client_vk_id        BIGINT NOT NULL,
  client_nick         TEXT   NOT NULL,
  companions          JSONB  NOT NULL DEFAULT '[]',
  from_location_id    INTEGER REFERENCES taxi_locations(id) ON DELETE SET NULL,
  to_location_id      INTEGER REFERENCES taxi_locations(id) ON DELETE SET NULL,
  from_name           TEXT,
  to_name             TEXT,
  promo_code          TEXT,
  discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- payment_type: cash | bank
  payment_type        TEXT NOT NULL DEFAULT 'cash',
  payment_screenshot  TEXT,
  base_price          NUMERIC(10,2),
  final_price         NUMERIC(10,2),
  status              TEXT NOT NULL DEFAULT 'pending',
  driver_vk_id        BIGINT,
  driver_nick         TEXT,
  estimated_time      TEXT,
  dispatch_message_id INTEGER,
  client_message_id   INTEGER,
  waiting_started_at  BIGINT,
  created_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  updated_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE INDEX IF NOT EXISTS idx_taxi_orders_client ON taxi_orders(client_vk_id);
CREATE INDEX IF NOT EXISTS idx_taxi_orders_status ON taxi_orders(status);

-- ── Promo Codes ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo_codes (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL,
  max_uses         INTEGER,
  used_count       INTEGER NOT NULL DEFAULT 0,
  expires_at       BIGINT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_by       BIGINT,
  created_at       BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Online Journal (Журнал Активности) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS online_status (
  vk_id        BIGINT PRIMARY KEY,
  nick         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'courier',
  -- status: online | afk | offline
  status       TEXT NOT NULL DEFAULT 'offline',
  status_text  TEXT NOT NULL DEFAULT '',
  last_seen    BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  online_since BIGINT
);

CREATE TABLE IF NOT EXISTS online_journal (
  id          SERIAL PRIMARY KEY,
  vk_id       BIGINT NOT NULL,
  nick        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'courier',
  peer_id     BIGINT NOT NULL,
  -- status: online | afk | offline
  status      TEXT NOT NULL,
  status_text TEXT NOT NULL DEFAULT '',
  -- event: !онлайн | !афк | !вышел
  event       TEXT NOT NULL,
  created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE INDEX IF NOT EXISTS idx_online_journal_vk ON online_journal(vk_id, created_at DESC);

-- ── Reports ───────────────────────────────────────────────────────────────────

-- courier_payouts: [{ nick, vk_id, bank_account, amount }]
CREATE TABLE IF NOT EXISTS daily_reports (
  id               SERIAL PRIMARY KEY,
  report_date      DATE NOT NULL UNIQUE,
  orders_count     INTEGER NOT NULL DEFAULT 0,
  total_revenue    NUMERIC(12,2) NOT NULL DEFAULT 0,
  courier_payouts  JSONB NOT NULL DEFAULT '[]',
  is_processed     BOOLEAN NOT NULL DEFAULT false,
  report_message_id INTEGER,
  created_at       BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- salary_payouts: [{ nick, vk_id, bank_account, salary, income_share }]
-- salary    = price - cost_price - price * rate   (rate = 0.15 or 0.10 if branded)
-- net_income = price * rate - (cost_price + salary) * 0.05
CREATE TABLE IF NOT EXISTS weekly_reports (
  id                SERIAL PRIMARY KEY,
  week_start        DATE NOT NULL UNIQUE,
  week_end          DATE NOT NULL,
  orders_count      INTEGER NOT NULL DEFAULT 0,
  total_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_income        NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_payouts    JSONB NOT NULL DEFAULT '[]',
  is_processed      BOOLEAN NOT NULL DEFAULT false,
  report_message_id INTEGER,
  created_at        BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Chat History ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_history (
  id           SERIAL PRIMARY KEY,
  peer_id      BIGINT NOT NULL,
  peer_name    TEXT,
  sender_vk_id BIGINT NOT NULL,
  sender_nick  TEXT,
  message_id   INTEGER,
  text         TEXT NOT NULL DEFAULT '',
  attachments  JSONB NOT NULL DEFAULT '[]',
  created_at   BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

CREATE INDEX IF NOT EXISTS idx_chat_history_peer ON chat_history(peer_id, created_at DESC);

-- ── VK Link Requests ──────────────────────────────────────────────────────────

-- requester_type: client | courier
-- status: pending | approved | rejected
CREATE TABLE IF NOT EXISTS vk_link_requests (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL,
  order_type      TEXT NOT NULL DEFAULT 'delivery',
  requester_vk_id BIGINT NOT NULL,
  requester_type  TEXT NOT NULL,
  target_vk_id    BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);

-- ── Employee Stats ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_stats (
  vk_id                BIGINT PRIMARY KEY REFERENCES employees(vk_id) ON DELETE CASCADE,
  delivery_orders_total INTEGER NOT NULL DEFAULT 0,
  taxi_orders_total     INTEGER NOT NULL DEFAULT 0,
  total_online_ms       BIGINT  NOT NULL DEFAULT 0,
  updated_at            BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
);
