# AMBRE — Cafe Automation CRM — Project Instructions

## Стек
- **Backend**: ASP.NET Core (.NET 9), Clean Architecture, EF Core, PostgreSQL
- **Frontend**: React + Vite + TypeScript, монорепо (`client-app/` + `admin-app/` + `shared/`)
- **Real-time**: SignalR (для /tables live-режима)

---

## Архитектура backend (обязательные правила)

### Слои (Clean Architecture)
- `Domain` — сущности, без зависимостей.
- `Application` — сервисы, DTO, интерфейсы репозиториев, спецификации. **Не знает про EF Core.**
- `Infrastructure` — реализация репозиториев, `AppDbContext`, `UnitOfWork`, `SpecificationEvaluator`.
- `Api` — контроллеры, middleware, DI-композиция.

### Result Pattern
Все сервисные методы возвращают `Result<T>` / `Result`, не бросают исключения для бизнес-логики. Исключения — только для реального fault (БД недоступна и т.п.), их ловит глобальный exception middleware.

### Specification Pattern (не IQueryable в Application!)
- Фильтрация/сортировка/пагинация — только через `ISpecification<T>` / `BaseSpecification<T>`.
- `SpecificationEvaluator` в Infrastructure — единственное место, где `IQueryable<T>` используется напрямую.
- Поддержка: Criteria (единый Expression), Includes + IncludeStrings (dot-path, напр. `"Items.Dish"`), OrderBy/OrderByDescending, ThenBy/ThenByDescending, Skip/Take.
- Уже реализовано для: **Order, StaffMember, Dish, Reservation**.
- **Не переводить** на Specification без явного запроса: `CategoryService`, `CustomerService`, `CafeTableService` — они на старом `PaginationHelper.CreatePagedResult(IEnumerable<T>)`, это осознанное решение, не баг.
- Не использовать нетранслируемые в SQL хелперы (`ServiceHelpers.BuildCustomerName` и т.п.) внутри Expression — только прямые сравнения полей навигационных сущностей.

### Repository + UnitOfWork
- `IUnitOfWork` — через `AppDbContext.SaveChangesAsync`, без ручных транзакций (если не попросят иначе).
- Простые сущности без спецификаций (Category, Customer, CafeTable, Payment, Discount, Tip) — простые репозитории без ISpecification.

### Concurrency
- `RowVersion` (byte[], concurrency token) в `BaseEntity` — обязателен для Order, OrderItem, Payment.
- Конфликт → 409 через глобальный exception middleware, не 500.

### Авторизация / безопасность
- ASP.NET Core Identity поверх `StaffMember`.
- JWT: access + **персистентный** refresh-токен (таблица RefreshToken, TTL конфигурируемый, revoke поддерживается).
- Роли: **Admin / Waiter / Kitchen / Client**. Контроллеры — `[Authorize(Roles=...)]` по матрице ролей, это самое рискованное место в проекте — при любых изменениях авторизации быть особенно аккуратным, не полагаться только на "должно работать", проговаривать матрицу явно.
- Row-level access: `ICurrentUserService` — для роли Waiter фильтровать заказы по `WaiterId` текущего пользователя.
- Ролевые DTO-проекции: `Salary`, `CostPrice` и другие чувствительные поля видны **только Admin**, не класть их в общий DTO.

### Middleware
- Глобальный exception handler: 409 (concurrency conflict), 400 (validation), 403 (forbidden), 500 (unhandled).

### Валидация
- Ручная валидация через Result Pattern, **не** FluentValidation (переход на FluentValidation — сознательно отложенный P2, не предлагать без запроса).

### Известные и осознанные технические долги (не "чинить" без запроса)
- SQL LIKE спецсимволы (`%`, `_`) в поиске — не экранируются (P2).
- `.ToLower().Contains()` вместо `OrdinalIgnoreCase` — разница на edge-case признана нерелевантной для проекта.
- Split-bill — не реализован (P2).
- Refund-флоу для `PartiallyPaid` при отмене заказа — статус уточнять отдельно, не считать готовым.

### Миграции
Генерировать при изменении модели, **не применять к БД без явного разрешения**.

---

## Frontend

### Структура монорепо
- `client-app/` — клиентское приложение
- `admin-app/` — админ-панель
- `shared/` — типы под backend DTO, API-клиент (axios + interceptor под JWT), design-tokens

### Стек фронта
react-router-dom, axios, zustand, tailwindcss, @tanstack/react-query, zod, react-hook-form.
client-app доп.: three, @react-three/fiber, drei, postprocessing.
admin-app доп.: recharts, date-fns. Floor plan (`/tables`): react-konva.

### Дизайн-система (не менять без явного решения)
- Light: фон `#FAF8F5`, текст `#1A1A1A`, акцент — терракот.
- Dark: фон `#121110` (тёплый графит), тот же акцент.
- Шрифты: Playfair Display / Fraunces (serif — заголовки, крупные числа) + **Montserrat** (UI-текст, вес 400/500/600-700). Serif-заголовки при переходе на Montserrat не трогать.
- 3D — только в hero client-app и, опционально, floor plan admin-app. Не декорация на каждом экране.
- Light/Dark toggle — **circle-reveal transition** через `document.startViewTransition()` + fallback, единый переиспользуемый hook на все страницы обоих приложений.
- Карточки: скругление ~12-16px, мягкая multi-layer тень, тонкая полупрозрачная граница вместо тяжёлой тени где уместно.

### Обработка состояний
- Loading — **skeleton**, не спиннер.
- 401 → refresh-flow (тихий retry через interceptor).
- 409 (concurrency conflict) → toast + refetch данных.
- Пустые состояния — честные нули/"нет данных", не мок-данные.

---

## Модуль /tables (floor plan) — контекст для реализации
- Новая сущность `Zone`, расширение `CafeTable`: PositionX/Y, Width/Height, Shape, ZoneId.
- Backend: CRUD зон + PATCH layout стола.
- Frontend: react-konva канва, drag-and-drop.
- Live mode (default) — просмотр, столы окрашены по статусу (свободен/занят/бронь/уборка), клик → детали заказа / быстрое создание.
- Editor mode (Admin-only, явный toggle) — редактирование расстановки.
- Real-time — SignalR; если SignalR ещё не готов, временный polling с явным TODO-комментарием.
- Reservation conflict-check: интервальное пересечение + 15-минутный буфер, Cancelled/Completed брони слот не блокируют.

---

## Общие правила работы над проектом
1. **Не переписывать архитектуру** без явного запроса — Specification Pattern, Result Pattern, слоение Clean Architecture — зафиксированные решения.
2. При неоднозначности между "как правильнее" и "как уже сделано в проекте" — спросить или явно указать оба варианта, не менять тихо.
3. Изменения в авторизации/RBAC — всегда явно перечислять, какие роли/эндпоинты затронуты.
4. После значимых изменений — `dotnet build`, сообщать результат.
5. Миграции — только генерация, применение к БД только по прямому разрешению.
6. Технический долг из списка выше — не трогать инициативно, только по запросу.