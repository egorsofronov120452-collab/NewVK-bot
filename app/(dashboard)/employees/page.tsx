'use client'

import { useEffect, useState, useCallback } from 'react'

interface Employee {
  vk_id: number; nickname: string; role: string; bank_account: string | null
  in_delivery_community: boolean; in_taxi_community: boolean; joined_at: number
}
interface Stat { vk_id: number; delivery_orders_total: number; taxi_orders_total: number; total_online_ms: number }
interface Car {
  id: number; employee_vk_id: number; car_name: string; car_photo: string | null
  is_personal: boolean; is_branded: boolean; is_org_car: boolean
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'РС', senior: 'СС', courier: 'Курьер', trainee: 'Стажёр', leadership: 'Руководство',
}

function formatMs(ms: number) {
  if (!ms) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}ч ${m}м` : `${m}м`
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats]         = useState<Stat[]>([])
  const [cars, setCars]           = useState<Car[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Employee | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      setEmployees(Array.isArray(json.employees) ? json.employees : [json.employees])
      setStats(Array.isArray(json.stats) ? json.stats : [json.stats])
      setCars(Array.isArray(json.cars) ? json.cars : [json.cars])
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function getStat(vk_id: number) { return stats.find(s => s.vk_id === vk_id) }
  function getCars(vk_id: number) { return cars.filter(c => c.employee_vk_id === vk_id) }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Сотрудники</h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">{employees.length} в базе</p>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Загрузка...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employee list */}
          <div className="md:col-span-1 flex flex-col gap-2">
            {employees.map(emp => {
              const stat = getStat(emp.vk_id)
              const empCars = getCars(emp.vk_id)
              const isSelected = selected?.vk_id === emp.vk_id
              return (
                <button
                  key={emp.vk_id}
                  onClick={() => setSelected(isSelected ? null : emp)}
                  className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                    isSelected
                      ? 'border-[var(--color-gold)] bg-[rgba(212,160,23,0.06)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-[var(--color-foreground)]">{emp.nickname}</span>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-muted)]">
                      {ROLE_LABELS[emp.role] ?? emp.role}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-[var(--color-muted)]">
                    {emp.in_delivery_community && <span>Доставка</span>}
                    {emp.in_taxi_community && <span>Такси</span>}
                  </div>
                  {stat && (
                    <div className="flex gap-3 mt-1 text-xs text-[var(--color-muted-foreground)]">
                      <span>{stat.delivery_orders_total} доставок</span>
                      <span>{stat.taxi_orders_total} такси</span>
                    </div>
                  )}
                  {empCars.length > 0 && (
                    <p className="text-xs text-[var(--color-muted)] mt-1 truncate">
                      Авто: {empCars.map(c => c.car_name).join(', ')}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Employee detail */}
          <div className="md:col-span-2">
            {!selected ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 flex items-center justify-center min-h-48">
                <p className="text-sm text-[var(--color-muted)]">Выберите сотрудника для просмотра профиля</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-foreground)]">{selected.nickname}</h2>
                    <p className="text-sm text-[var(--color-muted)]">{ROLE_LABELS[selected.role] ?? selected.role}</p>
                  </div>
                  <div className="flex gap-1">
                    {selected.in_delivery_community && (
                      <span className="text-xs rounded-full px-2 py-1 bg-[rgba(132,204,22,0.1)] border border-[rgba(132,204,22,0.2)] text-[var(--color-lime)]">Доставка</span>
                    )}
                    {selected.in_taxi_community && (
                      <span className="text-xs rounded-full px-2 py-1 bg-[rgba(212,160,23,0.1)] border border-[rgba(212,160,23,0.2)] text-[var(--color-gold)]">Такси</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-1">Банк. счёт</p>
                    <p className="text-sm font-mono text-[var(--color-foreground)]">{selected.bank_account ?? '—'}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-1">VK ID</p>
                    <p className="text-sm font-mono text-[var(--color-foreground)]">{selected.vk_id}</p>
                  </div>
                </div>

                {(() => {
                  const stat = getStat(selected.vk_id)
                  return stat ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Доставок', value: stat.delivery_orders_total },
                        { label: 'Такси', value: stat.taxi_orders_total },
                        { label: 'Онлайн', value: formatMs(stat.total_online_ms) },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">{s.label}</p>
                          <p className="text-2xl font-bold text-[var(--color-foreground)] mt-1">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}

                {(() => {
                  const empCars = getCars(selected.vk_id)
                  return empCars.length > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-2">Автопарк</p>
                      <div className="flex flex-col gap-2">
                        {empCars.map(car => (
                          <div key={car.id} className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] px-3 py-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--color-foreground)]">{car.car_name}</p>
                              <p className="text-xs text-[var(--color-muted)]">
                                {car.is_org_car ? 'Авто организации' : car.is_personal ? 'Личное' : ''}{car.is_branded ? ' · В цветах организации' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
