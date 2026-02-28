/**
 * staff-dm.ts
 * FSM для личных сообщений бота сообщества 1 (сотрудники).
 *
 * States:
 *   idle           → регистрация (если не зарегистрирован) или меню
 *   reg_nickname   → ввод никнейма
 *   reg_bank       → ввод банковского счёта
 *   reg_done       → регистрация завершена (переход в idle/меню)
 *   menu           → главное меню сотрудника
 *   add_car_pick   → выбор авто из списка
 *   add_car_colored → в цветах компании?
 *   add_car_photo   → приложить фото (только для личного авто)
 */

import {
  CHATS,
  SALARY_PCT_STANDARD,
  SALARY_PCT_COLORED,
  INCOME_PCT_STANDARD,
  INCOME_PCT_COLORED,
  EXPENSE_PCT,
} from './config';
import { sendMessageGroup, editMessageGroup, getUser } from './vk-api';
import {
  getStaffSession,
  upsertStaffSession,
  deleteStaffSession,
  getEmployee,
  registerEmployee,
  setUserNickname,
  setUserBankAccount,
  upsertUser,
  getAllCars,
  getEmployeeCars,
  addEmployeeCar,
  setUserSitePassword,
  getOnlineStatsForUser,
  getOnlineRankThisWeek,
  getAllEmployees,
} from './db';

// ─── Keyboard builders ─────────────────────────────────────────

function kb(buttons: { label: string; payload: object; color?: string }[][], inline = true) {
  return JSON.stringify({
    inline,
    buttons: buttons.map(row =>
      row.map(b => ({
        action: { type: 'callback', label: b.label, payload: JSON.stringify(b.payload) },
        color: b.color ?? 'secondary',
      })),
    ),
  });
}

function kbText(rows: { label: string; color?: string }[][]) {
  return JSON.stringify({
    one_time: false,
    buttons: rows.map(row =>
      row.map(b => ({
        action: { type: 'text', label: b.label },
        color: b.color ?? 'secondary',
      })),
    ),
  });
}

// ─── Show main staff menu ──────────────────────────────────────

async function showStaffMenu(peerId: number, emp: any) {
  const cars = await getEmployeeCars(peerId);
  const hasCar = cars.length > 0;
  const text = [
    `Добро пожаловать, ${emp.nickname ?? 'сотрудник'}!`,
    `Ник: ${emp.nickname ?? '—'}`,
    `Банк. счёт: ${emp.bankAccount ?? '—'}`,
    `Авто: ${hasCar ? `${cars.length} шт.` : 'не добавлено'}`,
    hasCar ? '' : '\nВНИМАНИЕ: без машины нельзя принимать заказы!',
  ].filter(l => l !== undefined).join('\n');

  await sendMessageGroup(peerId, text, 1, {
    keyboard: kbText([
      [{ label: 'Мой профиль', color: 'primary' }, { label: 'Мой автопарк', color: 'secondary' }],
      [{ label: 'Добавить машину', color: 'positive' }, { label: 'Статистика', color: 'secondary' }],
      [{ label: 'Пароль для сайта', color: 'secondary' }],
    ]),
  });
}

// ─── Main message handler ──────────────────────────────────────

export async function handleStaffDm(message: any) {
  const userId: number = message.from_id;
  const peerId: number = message.peer_id;

  // Только ЛС (peer_id === from_id)
  if (peerId !== userId) return;

  const text: string = (message.text ?? '').trim();
  const vkUser = await getUser(userId);
  if (vkUser) {
    await upsertUser(userId, vkUser.first_name, vkUser.last_name);
  }

  const session = await getStaffSession(userId);
  const state = session?.state ?? 'idle';
  const data = { ...(session?.data ?? {}) };

  // ─── FSM: текстовый ввод ─────────────────────────────────────

  if (state === 'reg_nickname') {
    if (!text || text.length < 2) {
      await sendMessageGroup(peerId, 'Введите ваш никнейм (минимум 2 символа):', 1);
      return;
    }
    data.nickname = text;
    await upsertStaffSession(userId, 'reg_bank', data);
    await sendMessageGroup(peerId, `Никнейм: ${text}\n\nВведите ваш банковский счёт (номер телефона или карты):`, 1);
    return;
  }

  if (state === 'reg_bank') {
    if (!text || text.length < 4) {
      await sendMessageGroup(peerId, 'Введите банковский счёт:', 1);
      return;
    }
    data.bankAccount = text;
    // Сохраняем данные
    await registerEmployee(userId);
    await setUserNickname(userId, data.nickname);
    await setUserBankAccount(userId, data.bankAccount);
    await deleteStaffSession(userId);
    await sendMessageGroup(peerId, `Регистрация завершена!\nНик: ${data.nickname}\nСчёт: ${text}\n\nТеперь добавьте машину для начала работы.`, 1, {
      keyboard: kbText([[{ label: 'Добавить машину', color: 'positive' }, { label: 'Главное меню' }]]),
    });
    return;
  }

  if (state === 'add_car_photo') {
    const photos = message.attachments?.filter((a: any) => a.type === 'photo') ?? [];
    const photoId = photos.length ? `photo${photos[0].photo.owner_id}_${photos[0].photo.id}` : null;
    await addEmployeeCar(userId, data.carId, false, data.isColored ?? false, photoId);
    await deleteStaffSession(userId);
    await sendMessageGroup(peerId, `Машина добавлена в ваш автопарк!${photoId ? ' (с фото)' : ''}`, 1, {
      keyboard: kbText([[{ label: 'Главное меню' }]]),
    });
    return;
  }

  if (state === 'set_password') {
    if (!text || text.length < 6) {
      await sendMessageGroup(peerId, 'Пароль должен быть не менее 6 символов. Попробуйте ещё раз:', 1);
      return;
    }
    // Простое bcrypt-like хеширование через crypto (Node.js встроенный)
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(text + userId).digest('hex');
    await setUserSitePassword(userId, hash);
    await deleteStaffSession(userId);
    await sendMessageGroup(peerId, 'Пароль для сайта установлен! Логин — ваш VK никнейм.', 1, {
      keyboard: kbText([[{ label: 'Главное меню' }]]),
    });
    return;
  }

  // ─── Text-кнопки главного меню ─────────────────────────────

  const emp = await getEmployee(userId);

  if (text === 'Главное меню' || text === '/start' || text === 'Начать') {
    if (!emp) {
      await deleteStaffSession(userId);
      await upsertStaffSession(userId, 'reg_nickname', {});
      await sendMessageGroup(peerId, 'Добро пожаловать! Для работы необходима регистрация.\n\nВведите ваш никнейм:', 1);
      return;
    }
    await deleteStaffSession(userId);
    await showStaffMenu(peerId, emp);
    return;
  }

  if (text === 'Мой профиль') {
    if (!emp) { await sendMessageGroup(peerId, 'Сначала зарегистрируйтесь. Напишите /start', 1); return; }
    const cars = await getEmployeeCars(userId);
    const stats = await getOnlineStatsForUser(userId, 7);
    const weekMin = stats.reduce((s: number, r: any) => s + r.total_minutes, 0);
    const fmt = (m: number) => `${Math.floor(m / 60)}ч. ${m % 60}м.`;
    const carLines = cars.length
      ? cars.map((c: any) => `• ${c.car_name}${c.is_colored ? ' [цвета]' : ''}${c.is_org_car ? ' (орг.)' : ' (личное)'}`).join('\n')
      : 'Нет машин';
    await sendMessageGroup(peerId,
      `Профиль\n\nНик: ${emp.nickname ?? '—'}\nРоль: ${emp.role ?? '—'}\nБанк. счёт: ${emp.bankAccount ?? '—'}\nОнлайн за неделю: ${fmt(weekMin)}\n\nАвтопарк:\n${carLines}`,
      1, { keyboard: kbText([[{ label: 'Главное меню' }]]) });
    return;
  }

  if (text === 'Мой автопарк') {
    if (!emp) { await sendMessageGroup(peerId, 'Сначала зарегистрируйтесь.', 1); return; }
    const cars = await getEmployeeCars(userId);
    if (!cars.length) {
      await sendMessageGroup(peerId, 'Автопарк пуст.\n\nДобавьте машину:', 1, {
        keyboard: kbText([[{ label: 'Добавить машину', color: 'positive' }, { label: 'Главное меню' }]]),
      });
      return;
    }
    const lines = cars.map((c: any, i: number) => `${i + 1}. ${c.car_name}${c.is_colored ? ' [цвета]' : ''}${c.is_org_car ? ' (орг.)' : ' (личное)'}`);
    await sendMessageGroup(peerId, `Ваш автопарк:\n${lines.join('\n')}`, 1, {
      keyboard: kbText([[{ label: 'Добавить машину', color: 'positive' }, { label: 'Главное меню' }]]),
    });
    return;
  }

  if (text === 'Добавить машину') {
    if (!emp) { await sendMessageGroup(peerId, 'Сначала зарегистрируйтесь.', 1); return; }
    const allCars = await getAllCars();
    if (!allCars.length) {
      await sendMessageGroup(peerId, 'Машины ещё не добавлены руководством.', 1, {
        keyboard: kbText([[{ label: 'Главное меню' }]]),
      });
      return;
    }
    const rows = allCars.map(c => [{ label: c.name, payload: { action: 'staff_car_pick', carId: c.id, carName: c.name, isOrg: c.isOrg } }]);
    rows.push([{ label: 'Отмена', payload: { action: 'staff_menu' } }]);
    await sendMessageGroup(peerId, 'Выберите машину из списка:', 1, { keyboard: kb(rows) });
    return;
  }

  if (text === 'Статистика') {
    if (!emp) { await sendMessageGroup(peerId, 'Сначала зарегистрируйтесь.', 1); return; }
    const stats = await getOnlineStatsForUser(userId, 30);
    const rank = await getOnlineRankThisWeek(userId);
    const todayMin = stats[0]?.total_minutes ?? 0;
    const weekMin = stats.slice(0, 7).reduce((s: number, r: any) => s + r.total_minutes, 0);
    const fmt = (m: number) => `${Math.floor(m / 60)}ч. ${m % 60}м.`;
    await sendMessageGroup(peerId,
      `Статистика ${emp.nickname ?? ''}:\nОнлайн сегодня: ${fmt(todayMin)}\nОнлайн за неделю: ${fmt(weekMin)}\nМесто в топе за неделю: ${rank > 0 ? `${rank}` : '—'}`,
      1, { keyboard: kbText([[{ label: 'Главное меню' }]]) });
    return;
  }

  if (text === 'Пароль для сайта') {
    if (!emp) { await sendMessageGroup(peerId, 'Сначала зарегистрируйтесь.', 1); return; }
    await upsertStaffSession(userId, 'set_password', {});
    await sendMessageGroup(peerId, 'Введите новый пароль для входа на сайт (минимум 6 символов):', 1);
    return;
  }

  // ─── Дефолт: если нет сессии и не зарегистрирован ──────────

  if (!emp && state === 'idle') {
    await upsertStaffSession(userId, 'reg_nickname', {});
    await sendMessageGroup(peerId, 'Добро пожаловать! Для работы необходима регистрация.\n\nВведите ваш никнейм:', 1);
    return;
  }

  if (emp && state === 'idle') {
    await showStaffMenu(peerId, emp);
    return;
  }
}

// ─── Callback handler (inline кнопки) ─────────────────────────

export async function handleStaffDmCallback(event: any) {
  const userId: number = event.object.user_id;
  const peerId: number = event.object.peer_id;
  const eventId: string = event.object.event_id;
  const payloadRaw = event.object.payload;
  const payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
  const action: string = payload.action;

  // Ack
  try {
    const { callVKGroup } = await import('./vk-api');
    await callVKGroup('messages.sendMessageEventAnswer', { event_id: eventId, user_id: userId, peer_id: peerId }, 1);
  } catch { /* ignore */ }

  // Только ЛС
  if (peerId !== userId) return;

  const emp = await getEmployee(userId);

  if (action === 'staff_menu') {
    await deleteStaffSession(userId);
    if (emp) await showStaffMenu(peerId, emp);
    else await sendMessageGroup(peerId, 'Напишите /start для регистрации.', 1);
    return;
  }

  if (action === 'staff_car_pick') {
    // payload: {carId, carName, isOrg}
    if (payload.isOrg) {
      // Авто организации — сразу добавляем без вопроса про цвета
      await addEmployeeCar(userId, payload.carId, true, true, null);
      await deleteStaffSession(userId);
      await sendMessageGroup(peerId, `Авто организации "${payload.carName}" добавлено в ваш автопарк.`, 1, {
        keyboard: JSON.stringify({ one_time: false, buttons: [[{ action: { type: 'text', label: 'Главное меню' }, color: 'secondary' }]] }),
      });
    } else {
      // Личное авто — спрашиваем цвета
      await upsertStaffSession(userId, 'add_car_colored', { carId: payload.carId, carName: payload.carName });
      await sendMessageGroup(peerId, `Машина: ${payload.carName}\n\nАвтомобиль в цветах компании?`, 1, {
        keyboard: kb([[
          { label: 'Да (скидка на комиссию)', payload: { action: 'staff_car_colored', isColored: true }, color: 'positive' },
          { label: 'Нет', payload: { action: 'staff_car_colored', isColored: false }, color: 'secondary' },
        ]]),
      });
    }
    return;
  }

  if (action === 'staff_car_colored') {
    const session = await getStaffSession(userId);
    const data = session?.data ?? {};
    data.isColored = payload.isColored;
    const pct = payload.isColored ? SALARY_PCT_COLORED * 100 : SALARY_PCT_STANDARD * 100;
    await upsertStaffSession(userId, 'add_car_photo', data);
    await sendMessageGroup(peerId,
      `В цветах компании: ${payload.isColored ? 'Да' : 'Нет'}\nКомиссия: ${pct}%\n\nПришлите фото автомобиля (или напишите "Пропустить"):`,
      1);
    return;
  }
}
