Ниже готовое **ТЗ в Markdown формате**. Создай файл:

```text
Backend/docs/technical-specification.md
```

и вставь туда это содержимое.

````md
# Техническое задание  
# Cafe Automation System

## 1. Название проекта

**Cafe Automation System** — backend-система для автоматизации работы кафе.

Проект будет реализован на **C# / .NET 10** с использованием **Clean Architecture**, **PostgreSQL**, **EF Core**, **Repository Pattern**, **Result Pattern**, **JWT Authentication**, **ASP.NET Core Identity**, **Redis Cache**, **Memory Cache**, **Serilog** и **Swagger/OpenAPI**.

---

## 2. Цель проекта

Цель проекта — создать гибкую, расширяемую и профессиональную backend-систему для управления кафе.

Система должна позволять:

- управлять меню кафе;
- управлять блюдами;
- управлять категориями блюд;
- управлять столиками;
- создавать заказы;
- добавлять блюда в заказы;
- считать стоимость заказа;
- применять скидки;
- учитывать чаевые;
- проводить оплату;
- отслеживать статусы заказов;
- управлять сотрудниками кафе;
- управлять ролями пользователей;
- просматривать отчёты;
- анализировать продажи;
- видеть популярные блюда;
- анализировать работу официантов;
- в будущем подключить web frontend;
- в будущем подключить мобильное приложение;
- в будущем подключить кухонный экран;
- в будущем расширить проект до полноценной системы кафе/ресторана.

---

## 3. Общая идея проекта

Проект представляет собой систему автоматизации кафе.

В кафе есть:

- меню;
- блюда;
- клиенты;
- столики;
- официанты;
- кассиры;
- повара;
- менеджеры;
- администраторы;
- заказы;
- оплаты;
- скидки;
- чаевые;
- отчёты.

Главная бизнес-логика проекта строится вокруг заказа.

Один заказ может содержать много блюд.

Например:

```text
Заказ ORD-2026-000001

Столик №5
Официант: Али

Блюда:
- Плов x2
- Чай x3
- Салат x1

Сумма блюд: 180 сомони
Скидка: 10 сомони
Чаевые: 15 сомони
Итого: 185 сомони
````

Поэтому в проекте обязательно должны быть:

* `Order`;
* `OrderItem`;
* `Dish`;
* `Payment`.

Без `OrderItem` система заказов будет неправильной, потому что один заказ не должен хранить просто "количество блюд". Он должен хранить список конкретных блюд.

---

## 4. Технологический стек

### Backend

* C#
* .NET 10
* ASP.NET Core Web API
* Clean Architecture
* EF Core
* PostgreSQL
* ASP.NET Core Identity
* JWT Bearer Authentication
* Role-based Authorization
* Repository Pattern
* Result Pattern
* Manual Mapping
* Serilog
* Swagger / OpenAPI
* Redis Cache
* Memory Cache
* Docker
* Docker Compose

### Database

* PostgreSQL

### Cache

* Redis Cache
* Memory Cache

### Frontend в будущем

Пока frontend не реализуется, но backend должен быть готов для подключения:

* React;
* Next.js;
* Vue;
* Angular;
* Flutter Web;
* или frontend, созданный через AI Agent.

### Mobile в будущем

Мобильная версия может быть реализована через:

* React Native;
* Flutter;
* MAUI;
* или мобильный UI, созданный через AI Agent.

---

## 5. Архитектура проекта

Проект должен использовать **Clean Architecture**.

Структура backend:

```text
Backend
├── CafeAutomation.sln
├── docs
│   ├── technical-specification.md
│   ├── database-design.md
│   ├── api-endpoints.md
│   ├── project-plan.md
│   └── development-rules.md
│
└── src
    ├── Api
    ├── Application
    ├── Domain
    └── Infrastructure
```

---

## 6. Ответственность слоёв

### 6.1. Domain

`Domain` — самый важный слой проекта.

Он содержит:

* entities;
* enums;
* constants;
* базовые классы.

В `Domain` запрещено использовать:

* EF Core;
* DbContext;
* Repository;
* Service;
* Controller;
* IdentityUser;
* JWT;
* Redis;
* Swagger;
* Serilog;
* DataAnnotations;
* Fluent API;
* внешние NuGet packages.

`Domain` должен быть чистым.

Пример:

```text
Domain
├── Common
├── Entities
├── Enums
└── Constants
```

---

### 6.2. Application

`Application` содержит бизнес-логику проекта.

Он содержит:

* DTOs;
* interfaces;
* services;
* result pattern;
* validation logic;
* pagination models;
* filter models.

В `Application` будут проверки:

* блюдо существует или нет;
* категория существует или нет;
* столик свободен или занят;
* заказ закрыт или нет;
* можно ли добавить блюдо в заказ;
* можно ли оплатить заказ;
* можно ли отменить заказ;
* можно ли удалить блюдо;
* можно ли применить скидку;
* можно ли закрыть заказ.

`Application` не должен напрямую работать с EF Core.

Он должен работать через interfaces.

---

### 6.3. Infrastructure

`Infrastructure` содержит техническую реализацию.

Он содержит:

* AppDbContext;
* EF Core configurations;
* repositories;
* Identity;
* JWT TokenService;
* Redis Cache;
* Memory Cache;
* Email service в будущем;
* File service в будущем;
* database seeders.

Пример:

```text
Infrastructure
├── Data
├── Configurations
├── Repositories
├── Identity
├── Cache
├── Seed
└── DependencyInjection.cs
```

---

### 6.4. Api

`Api` — это входная точка проекта.

Он содержит:

* controllers;
* middleware;
* Program.cs;
* appsettings.json;
* Swagger settings;
* authentication configuration;
* authorization configuration.

Контроллеры не должны содержать бизнес-логику.

Правильный поток:

```text
Controller -> Service -> Repository -> DbContext
```

---

## 7. Зависимости между слоями

Зависимости должны быть такими:

```text
Api -> Application
Api -> Infrastructure

Infrastructure -> Application
Infrastructure -> Domain

Application -> Domain

Domain -> nothing
```

`Domain` не должен зависеть ни от одного слоя.

---

## 8. Основные модули системы

В MVP будут реализованы следующие модули:

1. Auth module
2. Users / Staff module
3. Categories module
4. Dishes module
5. Cafe Tables module
6. Customers module
7. Orders module
8. Order Items module
9. Payments module
10. Discounts module
11. Tips module
12. Reservations module
13. Dashboard module
14. Reports module

---

## 9. MVP проекта

MVP — это первая рабочая версия проекта.

В MVP не нужно делать всё идеально как в большой ресторанной системе. Но нужно сделать правильное ядро, которое потом можно расширять.

### MVP должен включать:

* авторизацию;
* роли;
* категории блюд;
* блюда;
* столики;
* клиентов;
* сотрудников;
* заказы;
* позиции заказа;
* оплату;
* скидки;
* чаевые;
* базовые отчёты;
* dashboard;
* Redis cache для dashboard и reports;
* Swagger;
* Serilog;
* middleware для ошибок;
* PostgreSQL database;
* migrations;
* seed roles;
* seed admin user.

---

## 10. Что не входит в первый MVP

В первую версию не входят:

* складской учёт;
* ингредиенты;
* закупки;
* поставщики;
* доставка;
* QR menu;
* online ordering;
* бонусная система;
* программа лояльности;
* push notifications;
* kitchen display system;
* advanced analytics;
* бухгалтерия;
* интеграция с кассовыми аппаратами;
* интеграция с банками;
* мобильное приложение.

Эти функции будут добавлены позже.

---

## 11. Главные бизнес-сущности

### 11.1. Category

Категория нужна для группировки блюд.

Примеры:

* Горячие блюда;
* Напитки;
* Салаты;
* Десерты;
* Завтраки;
* Сезонное меню.

Поля:

```text
Id
Name
Description
IsActive
CreatedAt
UpdatedAt
IsDeleted
```

---

### 11.2. Dish

Блюдо — это товар, который кафе продаёт клиенту.

Поля:

```text
Id
Name
Description
Price
CostPrice
CookingTimeMinutes
Calories
ImageUrl
IngredientsDescription
IsAvailable
IsSeasonal
Status
Type
CategoryId
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* `Price` — цена продажи.
* `CostPrice` — себестоимость.
* `Price` должен быть больше 0.
* `CostPrice` не должен быть больше `Price`.
* Блюдо нельзя заказать, если оно недоступно.
* Блюдо нельзя удалить физически, если оно уже использовалось в заказах.
* Для удаления нужно использовать soft delete через `IsDeleted`.

---

### 11.3. CafeTable

Столик кафе.

Поля:

```text
Id
TableNumber
SeatsCount
Status
Location
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* `TableNumber` — это номер столика в кафе.
* `Id` и `TableNumber` — не одно и то же.
* Номер столика должен быть уникальным.
* Столик может быть свободен, занят, зарезервирован, на уборке или отключен.
* Нельзя создать dine-in заказ на отключенный столик.
* Нельзя посадить клиента за занятый столик.

---

### 11.4. Customer

Клиент кафе.

Поля:

```text
Id
FirstName
LastName
Phone
Email
RegisteredAt
Status
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Клиент может быть гостем.
* Заказ может быть без клиента.
* Клиент не обязан иметь аккаунт в Identity.
* В будущем клиента можно связать с личным кабинетом.

---

### 11.5. StaffMember

Сотрудник кафе.

Поля:

```text
Id
IdentityUserId
FirstName
LastName
MiddleName
Phone
Email
Role
Status
HireDate
FiredDate
Salary
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* StaffMember — это профиль сотрудника.
* IdentityUserId нужен для связи с ASP.NET Core Identity.
* Domain не должен наследоваться от IdentityUser.
* Официант, кассир, повар, менеджер и админ являются сотрудниками.
* Заказ может ссылаться на официанта.
* Уволенный сотрудник не должен создавать новые заказы.

---

### 11.6. Order

Заказ — главная сущность системы.

Поля:

```text
Id
OrderNumber
OrderedAt
ClosedAt
Status
Type
CustomerId
CafeTableId
WaiterId
SubTotal
DiscountAmount
TipAmount
TotalAmount
PaymentStatus
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Один заказ может содержать много блюд.
* Заказ может быть без клиента.
* Заказ может быть без столика, если это take away или delivery.
* Заказ может быть без официанта, если он создан кассиром или системой.
* Нельзя добавить блюдо в закрытый заказ.
* Нельзя оплатить отменённый заказ.
* Нельзя отменить уже оплаченный и закрытый заказ без отдельной refund-логики.
* Нельзя закрыть заказ без оплаты.
* Суммы заказа должны пересчитываться в сервисе.

---

### 11.7. OrderItem

Позиция заказа.

Поля:

```text
Id
OrderId
DishId
Quantity
UnitPrice
TotalPrice
Status
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* `OrderItem` обязателен.
* Один заказ может содержать много `OrderItem`.
* `UnitPrice` нужно сохранять отдельно.
* Цена блюда может измениться в будущем, но старый заказ должен сохранить старую цену.
* `TotalPrice = Quantity * UnitPrice`.
* Количество должно быть больше 0.
* Нельзя добавить недоступное блюдо.
* Нельзя изменить позицию заказа, если заказ закрыт.

---

### 11.8. Payment

Оплата заказа.

Поля:

```text
Id
OrderId
Amount
Method
Status
PaidAt
TransactionNumber
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Один заказ может иметь несколько оплат.
* Например: часть наличными, часть картой.
* Сумма оплат не должна превышать итоговую сумму заказа.
* Если сумма оплат равна итоговой сумме заказа, заказ получает статус `Paid`.
* Если оплачена только часть, заказ получает статус `PartiallyPaid`.
* Нельзя оплатить отменённый заказ.
* Нельзя оплатить закрытый заказ повторно.

---

### 11.9. Discount

Скидка заказа.

Поля:

```text
Id
OrderId
Name
Type
Value
Amount
Reason
AppliedAt
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Скидка может быть процентной.
* Скидка может быть фиксированной.
* Процентная скидка не должна быть больше 100%.
* Фиксированная скидка не должна быть больше суммы заказа.
* После применения скидки заказ должен пересчитать итоговую сумму.

---

### 11.10. Tip

Чаевые.

Поля:

```text
Id
OrderId
StaffMemberId
Amount
Method
GivenAt
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Чаевые могут быть связаны с официантом.
* Чаевые могут быть наличными или картой.
* Чаевые не должны быть отрицательными.
* Чаевые увеличивают финальную сумму заказа.

---

### 11.11. Reservation

Бронь столика.

Поля:

```text
Id
CafeTableId
CustomerId
CustomerName
Phone
GuestsCount
ReservedAt
CancelledAt
Status
Note
CreatedAt
UpdatedAt
IsDeleted
```

Важные правила:

* Бронь может быть без зарегистрированного клиента.
* Но `CustomerName` обязателен.
* Нельзя создать бронь на отключенный столик.
* Нельзя создать бронь на прошедшее время.
* Нельзя посадить гостей, если бронь отменена.
* Статусы брони должны отражать жизненный цикл бронирования.

---

## 12. Enums

В проекте должны быть enums:

```text
DishStatus
DishType
TableStatus
OrderStatus
OrderType
OrderItemStatus
PaymentStatus
PaymentMethod
DiscountType
StaffRole
StaffStatus
ReservationStatus
CustomerStatus
```

---

## 13. Роли системы

Система должна иметь следующие роли:

```text
Admin
Manager
Waiter
Cashier
Kitchen
```

### Admin

Может:

* управлять всеми пользователями;
* управлять ролями;
* управлять меню;
* управлять блюдами;
* управлять столиками;
* смотреть все отчёты;
* управлять сотрудниками;
* видеть dashboard;
* удалять и восстанавливать данные.

### Manager

Может:

* управлять меню;
* управлять блюдами;
* смотреть отчёты;
* смотреть dashboard;
* управлять бронированиями;
* смотреть работу официантов.

### Waiter

Может:

* создавать заказы;
* добавлять блюда в заказ;
* менять статус позиции заказа;
* видеть свои заказы;
* закрывать обслуживание столика;
* принимать чаевые, если это разрешено.

### Cashier

Может:

* принимать оплату;
* применять скидку, если разрешено;
* закрывать заказ;
* печатать чек в будущем;
* смотреть оплаченные заказы.

### Kitchen

Может:

* видеть новые блюда для приготовления;
* менять статус блюда в заказе;
* отмечать блюдо как готовое.

---

## 14. Auth module

Для авторизации использовать:

* ASP.NET Core Identity;
* JWT Bearer;
* Role-based Authorization.

### Основные endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/change-password
POST /api/auth/refresh-token
POST /api/auth/logout
GET  /api/auth/me
```

### Register

Регистрация должна создавать пользователя Identity и при необходимости StaffMember.

В MVP регистрация может быть доступна только Admin.

Обычные сотрудники создаются админом.

### Login

Login возвращает:

```text
accessToken
refreshToken
expiresAt
userInfo
roles
```

### JWT Claims

Токен должен содержать:

```text
UserId
Email
FullName
Roles
```

---

## 15. Result Pattern

Сервисы должны возвращать Result.

Простой формат:

```text
Result<T>
- IsSuccess
- Message
- Data
- Errors
```

Не нужно делать слишком сложный Result Pattern.

Главная цель:

* не бросать exception для обычных validation ошибок;
* красиво возвращать сообщения;
* держать controllers простыми.

Пример логики:

```text
Если блюдо не найдено:
Result.Failure("Dish not found")

Если всё успешно:
Result.Success(data, "Dish created successfully")
```

---

## 16. Repository Pattern

Repository нужен для работы с базой.

Repository не должен содержать бизнес-логику.

Repository отвечает только за:

* получить данные;
* добавить данные;
* обновить данные;
* удалить данные;
* проверить существование;
* сохранить изменения.

Пример:

```text
IDishRepository
DishRepository
```

В сервисе будет бизнес-логика.

В repository будет EF Core logic.

---

## 17. Services

Services находятся в Application.

Основные сервисы:

```text
IAuthService
IUserService
ICategoryService
IDishService
ICafeTableService
ICustomerService
IStaffService
IOrderService
IPaymentService
IDiscountService
ITipService
IReservationService
IDashboardService
IReportService
```

---

## 18. Controllers

Controllers находятся в Api.

Основные controllers:

```text
AuthController
UsersController
CategoriesController
DishesController
CafeTablesController
CustomersController
StaffController
OrdersController
PaymentsController
DiscountsController
TipsController
ReservationsController
DashboardController
ReportsController
```

Контроллер не должен содержать бизнес-логику.

Контроллер должен:

* принять request;
* вызвать service;
* вернуть response.

---

## 19. DTOs

Каждый модуль должен иметь DTO.

Пример для Dish:

```text
CreateDishDto
UpdateDishDto
GetDishDto
DishFilterDto
```

Пример для Order:

```text
CreateOrderDto
AddOrderItemDto
UpdateOrderStatusDto
GetOrderDto
GetOrderItemDto
OrderFilterDto
```

DTO не должны быть слишком сложными.

Mapping делаем вручную.

AutoMapper не использовать.

---

## 20. Manual Mapping

В проекте используется ручной mapping.

Пример:

```text
entity -> dto
dto -> entity
```

AutoMapper не использовать, чтобы код был понятный для чтения и контроля.

---

## 21. Validation rules

Валидации должны быть в Application Services.

Контроллеры не должны содержать бизнес-валидации.

### Category validations

* Name обязателен.
* Name не должен повторяться.
* Category нельзя удалить, если в ней есть активные блюда.

### Dish validations

* Name обязателен.
* Price должен быть больше 0.
* CostPrice не должен быть отрицательным.
* CookingTimeMinutes не должен быть отрицательным.
* Category должна существовать.
* Блюдо нельзя заказать, если `IsAvailable = false`.
* Блюдо нельзя удалить физически, если оно есть в заказах.

### CafeTable validations

* TableNumber должен быть уникальным.
* SeatsCount должен быть больше 0.
* Нельзя создать заказ на Disabled table.
* Нельзя посадить клиента за Occupied table.

### Customer validations

* Phone не должен повторяться, если указан.
* Email не должен повторяться, если указан.
* Нельзя создать клиента без имени и телефона одновременно.

### Staff validations

* Email не должен повторяться.
* Phone не должен повторяться.
* Уволенный сотрудник не может создавать заказы.
* Только сотрудник с ролью Waiter может быть waiter в заказе.

### Order validations

* DineIn заказ должен иметь CafeTableId.
* TakeAway заказ может не иметь столик.
* Delivery заказ может не иметь столик.
* Нельзя добавить item в Closed order.
* Нельзя добавить item в Cancelled order.
* Нельзя закрыть заказ без оплаты.
* Нельзя оплатить Cancelled order.
* Нельзя отменить Paid order без refund logic.
* TotalAmount не должен быть отрицательным.

### OrderItem validations

* Quantity должен быть больше 0.
* Dish должен существовать.
* Dish должен быть available.
* UnitPrice берётся из текущей цены блюда.
* TotalPrice считается автоматически в сервисе.

### Payment validations

* Amount должен быть больше 0.
* Нельзя оплатить больше, чем TotalAmount.
* Нельзя оплатить Cancelled order.
* Нельзя повторно оплатить полностью оплаченный заказ.

### Discount validations

* Percentage должен быть от 1 до 100.
* FixedAmount не должен быть больше SubTotal.
* Скидку нельзя применить к закрытому заказу.
* Скидку нельзя применить к отменённому заказу.

### Tip validations

* Amount должен быть больше или равен 0.
* StaffMember должен существовать, если указан.
* Чаевые нельзя добавить к отменённому заказу.

### Reservation validations

* CafeTable должен существовать.
* ReservedAt должен быть в будущем.
* GuestsCount должен быть больше 0.
* GuestsCount не должен превышать SeatsCount столика.
* Нельзя бронировать Disabled table.
* Нельзя бронировать один и тот же столик на одно и то же время.

---

## 22. Расчёт суммы заказа

Суммы считаются в `OrderService`.

### Основные поля:

```text
SubTotal
DiscountAmount
TipAmount
TotalAmount
```

### Формула:

```text
SubTotal = Sum(OrderItems.TotalPrice)

DiscountAmount = Sum(Discounts.Amount)

TipAmount = Sum(Tips.Amount)

TotalAmount = SubTotal - DiscountAmount + TipAmount
```

`TotalAmount` не должен быть меньше 0.

---

## 23. Статусы заказа

Жизненный цикл заказа:

```text
New -> Accepted -> Cooking -> Ready -> Served -> Closed
```

Отдельный путь:

```text
New -> Cancelled
Accepted -> Cancelled
Cooking -> Cancelled
```

После `Closed` заказ нельзя менять.

После `Cancelled` заказ нельзя оплачивать.

---

## 24. Статусы оплаты

```text
Unpaid
Pending
PartiallyPaid
Paid
Failed
Refunded
Cancelled
```

Логика:

* если нет оплат — `Unpaid`;
* если сумма оплат меньше TotalAmount — `PartiallyPaid`;
* если сумма оплат равна TotalAmount — `Paid`;
* если оплата не прошла — `Failed`;
* если деньги вернули — `Refunded`.

---

## 25. Dashboard

Dashboard должен показывать краткую статистику.

В MVP:

```text
TotalOrdersToday
TotalRevenueToday
ActiveOrders
ClosedOrders
CancelledOrders
PopularDishes
TotalCustomers
TotalTables
OccupiedTables
FreeTables
```

Dashboard должен использовать cache.

---

## 26. Reports

Reports нужны для анализа.

В MVP:

### Sales report

Показывает:

```text
TotalOrders
TotalRevenue
AverageOrderAmount
TotalDiscounts
TotalTips
```

Фильтры:

```text
fromDate
toDate
```

### Popular dishes report

Показывает:

```text
DishId
DishName
TotalQuantitySold
TotalRevenue
```

### Waiter performance report

Показывает:

```text
WaiterId
WaiterName
TotalOrders
TotalSales
TotalTips
```

### Payment report

Показывает:

```text
CashTotal
CardTotal
OnlineTotal
MixedTotal
```

---

## 27. Cache strategy

В проекте использовать:

* MemoryCache;
* Redis Cache.

### MemoryCache

Можно использовать для простых локальных данных:

* small lookup data;
* system roles;
* small settings.

### Redis Cache

Использовать для:

* dashboard summary;
* popular dishes;
* sales reports;
* menu list;
* active dishes.

### Cache keys

Пример:

```text
dashboard:summary
reports:sales:{fromDate}:{toDate}
reports:popular-dishes:{fromDate}:{toDate}
menu:active-dishes
```

### Cache invalidation

Cache нужно очищать при изменении:

* заказа;
* оплаты;
* скидки;
* чаевых;
* блюда;
* категории.

---

## 28. Database

База данных: PostgreSQL.

### Основные таблицы MVP:

```text
Categories
Dishes
CafeTables
Customers
StaffMembers
Orders
OrderItems
Payments
Discounts
Tips
Reservations
AspNetUsers
AspNetRoles
AspNetUserRoles
```

### Правила БД:

* использовать migrations;
* decimal поля настраивать через Fluent API;
* связи настраивать через Fluent API;
* delete behavior продумать отдельно;
* для важных данных использовать soft delete;
* финансовые данные физически не удалять.

---

## 29. EF Core configurations

Fluent API должен быть в Infrastructure:

```text
Infrastructure/Configurations
```

Для каждой entity отдельный configuration:

```text
DishConfiguration
CategoryConfiguration
OrderConfiguration
OrderItemConfiguration
PaymentConfiguration
```

DataAnnotations не использовать или использовать минимально.

Главная настройка должна быть через Fluent API.

---

## 30. Delete strategy

Физическое удаление использовать осторожно.

### Soft delete

Использовать для:

* Category;
* Dish;
* CafeTable;
* Customer;
* StaffMember;
* Order;
* OrderItem;
* Payment;
* Discount;
* Tip;
* Reservation.

Поле:

```text
IsDeleted
```

Финансовые данные нельзя удалять физически.

---

## 31. Logging

Использовать Serilog.

Логировать:

* ошибки;
* failed login attempts;
* создание заказа;
* оплату заказа;
* отмену заказа;
* применение скидки;
* критические операции администратора.

Не логировать:

* password;
* access token;
* refresh token;
* sensitive user data.

---

## 32. Middleware

В Api должны быть middleware:

```text
ExceptionMiddleware
RequestLoggingMiddleware
```

### ExceptionMiddleware

Должен ловить неожиданные ошибки и возвращать единый response.

### RequestLoggingMiddleware

Может логировать:

* method;
* path;
* status code;
* elapsed time.

---

## 33. API response format

Все ответы API должны быть единообразными.

Пример success:

```json
{
  "isSuccess": true,
  "message": "Dish created successfully",
  "data": {}
}
```

Пример failure:

```json
{
  "isSuccess": false,
  "message": "Dish not found",
  "errors": []
}
```

---

## 34. Pagination

Для списков использовать pagination.

Пример query:

```text
GET /api/dishes?pageNumber=1&pageSize=10
```

Response:

```text
items
pageNumber
pageSize
totalCount
totalPages
hasNextPage
hasPreviousPage
```

---

## 35. Filtering

Фильтры нужны для:

* dishes;
* orders;
* payments;
* reports;
* reservations;
* customers.

Примеры:

```text
GET /api/dishes?categoryId=1&isAvailable=true
GET /api/orders?status=New&fromDate=2026-01-01&toDate=2026-01-31
GET /api/payments?method=Cash
```

---

## 36. Sorting

Sorting можно добавить после MVP.

Пример:

```text
GET /api/dishes?sortBy=price&sortDirection=asc
```

---

## 37. Swagger

Swagger должен быть включён в development.

Swagger должен показывать:

* auth endpoints;
* protected endpoints;
* request models;
* response models;
* JWT Bearer authorization.

---

## 38. Docker

В будущем проект должен запускаться через Docker Compose.

Контейнеры:

```text
api
postgres
redis
```

Пример:

```text
Cafe.Api
PostgreSQL
Redis
```

---

## 39. AppSettings

В `appsettings.json` должны быть секции:

```text
ConnectionStrings
JwtSettings
RedisSettings
Serilog
AllowedHosts
```

Пример:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=cafe_db;Username=postgres;Password=12345",
    "Redis": "localhost:6379"
  },
  "JwtSettings": {
    "Issuer": "CafeAutomation",
    "Audience": "CafeAutomationUsers",
    "Key": "SUPER_SECRET_KEY_CHANGE_THIS",
    "AccessTokenMinutes": 60,
    "RefreshTokenDays": 7
  }
}
```

---

## 40. Development workflow

Работа над проектом должна идти по этапам.

---

## 41. Этап 1 — Подготовка solution

Цель:

* создать solution;
* создать проекты;
* настроить references;
* проверить build.

Структура:

```text
Backend
├── CafeAutomation.sln
└── src
    ├── Api
    ├── Application
    ├── Domain
    └── Infrastructure
```

Результат этапа:

```text
dotnet build
```

должен проходить без ошибок.

---

## 42. Этап 2 — Domain Layer

Цель:

* полностью подготовить Domain;
* создать entities;
* создать enums;
* создать constants;
* не подключать EF Core;
* не писать DbContext;
* не писать services;
* не писать repositories.

Entities:

```text
Category
Dish
CafeTable
Customer
StaffMember
Order
OrderItem
Payment
Discount
Tip
Reservation
```

Enums:

```text
DishStatus
DishType
TableStatus
OrderStatus
OrderType
OrderItemStatus
PaymentStatus
PaymentMethod
DiscountType
StaffRole
StaffStatus
ReservationStatus
CustomerStatus
```

Результат:

* Domain компилируется;
* Domain не зависит от других проектов.

---

## 43. Этап 3 — Application Layer Base

Цель:

* создать DTOs;
* создать interfaces;
* создать Result Pattern;
* создать PagedResult;
* создать базовые service contracts.

Папки:

```text
Application
├── DTOs
├── Interfaces
├── Services
├── Results
└── Common
```

Результат:

* Application зависит только от Domain;
* нет EF Core;
* нет Infrastructure logic.

---

## 44. Этап 4 — Infrastructure Base

Цель:

* подключить EF Core;
* подключить PostgreSQL;
* создать AppDbContext;
* создать configurations;
* создать repositories;
* подключить Identity.

Папки:

```text
Infrastructure
├── Data
├── Configurations
├── Repositories
├── Identity
├── Cache
└── Seed
```

Результат:

* migrations создаются;
* database update работает;
* таблицы создаются в PostgreSQL.

---

## 45. Этап 5 — Auth and Identity

Цель:

* настроить ASP.NET Core Identity;
* настроить JWT;
* создать роли;
* создать admin user;
* сделать login;
* сделать register для admin-created users;
* сделать current user endpoint.

Роли:

```text
Admin
Manager
Waiter
Cashier
Kitchen
```

Результат:

* login возвращает JWT;
* protected endpoints работают;
* role-based authorization работает.

---

## 46. Этап 6 — CRUD Modules

Цель:

Реализовать CRUD для:

```text
Categories
Dishes
CafeTables
Customers
StaffMembers
Reservations
```

Каждый CRUD должен иметь:

* controller;
* service;
* repository;
* DTOs;
* validations;
* logging;
* result response.

---

## 47. Этап 7 — Order Module

Цель:

Реализовать полноценную работу с заказами.

Endpoints:

```text
POST /api/orders
GET /api/orders
GET /api/orders/{id}
POST /api/orders/{id}/items
PUT /api/orders/{id}/items/{itemId}
DELETE /api/orders/{id}/items/{itemId}
PUT /api/orders/{id}/status
POST /api/orders/{id}/cancel
POST /api/orders/{id}/close
```

Бизнес-логика:

* создать заказ;
* добавить блюдо;
* изменить количество блюда;
* удалить блюдо из заказа;
* пересчитать сумму;
* поменять статус;
* отменить заказ;
* закрыть заказ.

---

## 48. Этап 8 — Payment Module

Цель:

Реализовать оплату.

Endpoints:

```text
POST /api/orders/{id}/payments
GET /api/orders/{id}/payments
POST /api/payments/{id}/refund
```

Логика:

* частичная оплата;
* полная оплата;
* оплата наличными;
* оплата картой;
* online оплата в будущем;
* refund в будущем.

---

## 49. Этап 9 — Discounts and Tips

Цель:

Реализовать:

* скидки;
* чаевые;
* пересчёт суммы заказа.

Endpoints:

```text
POST /api/orders/{id}/discounts
POST /api/orders/{id}/tips
```

---

## 50. Этап 10 — Dashboard and Reports

Цель:

Реализовать dashboard и отчёты.

Endpoints:

```text
GET /api/dashboard/summary
GET /api/reports/sales
GET /api/reports/popular-dishes
GET /api/reports/waiters
GET /api/reports/payments
```

Использовать Redis cache.

---

## 51. Этап 11 — Docker

Цель:

* создать Dockerfile;
* создать docker-compose.yml;
* поднять PostgreSQL;
* поднять Redis;
* поднять Api.

---

## 52. Этап 12 — Frontend / Mobile через AI Agent

Backend должен быть готов для frontend.

Для этого нужно:

* иметь чистый Swagger;
* иметь понятные endpoints;
* иметь DTOs;
* иметь единый response format;
* иметь auth flow;
* иметь role-based endpoints.

Frontend потом может быть реализован через:

```text
React
Next.js
Flutter
React Native
AI Agent
```

---

## 53. Основные API endpoints MVP

### Auth

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/change-password
POST /api/auth/refresh-token
```

### Categories

```text
GET    /api/categories
GET    /api/categories/{id}
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}
```

### Dishes

```text
GET    /api/dishes
GET    /api/dishes/{id}
POST   /api/dishes
PUT    /api/dishes/{id}
DELETE /api/dishes/{id}
PATCH  /api/dishes/{id}/availability
```

### CafeTables

```text
GET    /api/tables
GET    /api/tables/{id}
POST   /api/tables
PUT    /api/tables/{id}
DELETE /api/tables/{id}
PATCH  /api/tables/{id}/status
```

### Customers

```text
GET    /api/customers
GET    /api/customers/{id}
POST   /api/customers
PUT    /api/customers/{id}
DELETE /api/customers/{id}
```

### Staff

```text
GET    /api/staff
GET    /api/staff/{id}
POST   /api/staff
PUT    /api/staff/{id}
DELETE /api/staff/{id}
PATCH  /api/staff/{id}/status
```

### Orders

```text
GET    /api/orders
GET    /api/orders/{id}
POST   /api/orders
PUT    /api/orders/{id}/status
POST   /api/orders/{id}/cancel
POST   /api/orders/{id}/close
```

### Order Items

```text
POST   /api/orders/{id}/items
PUT    /api/orders/{id}/items/{itemId}
DELETE /api/orders/{id}/items/{itemId}
```

### Payments

```text
POST /api/orders/{id}/payments
GET  /api/orders/{id}/payments
```

### Discounts

```text
POST /api/orders/{id}/discounts
GET  /api/orders/{id}/discounts
```

### Tips

```text
POST /api/orders/{id}/tips
GET  /api/orders/{id}/tips
```

### Reservations

```text
GET    /api/reservations
GET    /api/reservations/{id}
POST   /api/reservations
PUT    /api/reservations/{id}
DELETE /api/reservations/{id}
PATCH  /api/reservations/{id}/status
```

### Dashboard

```text
GET /api/dashboard/summary
```

### Reports

```text
GET /api/reports/sales
GET /api/reports/popular-dishes
GET /api/reports/waiters
GET /api/reports/payments
```

---

## 54. Security requirements

* Пароли хранить только через ASP.NET Core Identity.
* Не хранить password plain text.
* JWT key хранить в configuration.
* Не логировать токены.
* Не логировать пароли.
* Endpoints защищать через `[Authorize]`.
* Admin endpoints защищать через roles.
* Swagger должен поддерживать Bearer Token.

---

## 55. Error handling

Все неожиданные ошибки должны проходить через middleware.

Validation ошибки должны возвращаться из services через Result.

Пример:

```json
{
  "isSuccess": false,
  "message": "Dish not found",
  "errors": []
}
```

---

## 56. Code style

Код должен быть:

* простой;
* читаемый;
* понятный;
* без лишней магии;
* без слишком сложных generic abstractions;
* без AutoMapper;
* без лишних packages;
* с понятными названиями;
* с ручным mapping;
* с validation logic в services.

Не использовать сложный DDD в MVP.

---

## 57. Git workflow

Работать по веткам.

Основные ветки:

```text
main
develop
feature/domain
feature/application
feature/infrastructure
feature/auth
feature/orders
feature/reports
```

Коммиты должны быть понятными:

```text
feat: add domain entities
feat: add order service
fix: correct payment validation
refactor: improve dish service
docs: add technical specification
```

---

## 58. Testing

В будущем добавить tests.

Минимум:

* unit tests для services;
* integration tests для controllers;
* tests для order calculation;
* tests для payment logic;
* tests для discount logic.

Самые важные тесты:

```text
Order total calculation
Adding item to order
Applying discount
Adding payment
Closing order
Cancelling order
```

---

## 59. Acceptance criteria

Проект считается готовым как MVP, если:

* solution собирается без ошибок;
* PostgreSQL подключён;
* migrations работают;
* Identity работает;
* JWT login работает;
* роли работают;
* Admin user создаётся;
* CRUD для основных сущностей работает;
* можно создать заказ;
* можно добавить блюда в заказ;
* сумма заказа считается правильно;
* можно применить скидку;
* можно добавить чаевые;
* можно оплатить заказ;
* можно закрыть заказ;
* dashboard показывает данные;
* reports показывают данные;
* Swagger работает;
* Serilog пишет logs;
* Redis используется для dashboard/reports;
* код разделён по Clean Architecture;
* Domain не зависит от других слоёв;
* Application не зависит от Infrastructure;
* Controllers не содержат бизнес-логику.

---

## 60. Будущее расширение проекта

После MVP можно добавить:

### Kitchen Display System

* экран кухни;
* новые блюда;
* блюда в процессе;
* готовые блюда;
* задержанные блюда.

### Stock Management

* ингредиенты;
* склад;
* списание продуктов;
* закупки;
* поставщики.

### Delivery

* доставка;
* адрес клиента;
* курьер;
* статус доставки.

### QR Menu

* клиент сканирует QR;
* видит меню;
* делает заказ со столика.

### Loyalty System

* бонусы;
* скидки постоянным клиентам;
* промокоды.

### Notifications

* уведомления официантам;
* уведомления кухне;
* уведомления админам.

### Advanced Reports

* прибыль по дням;
* прибыль по месяцам;
* эффективность сотрудников;
* средний чек;
* самые прибыльные блюда;
* блюда с низкой продажей.

---

## 61. Главный принцип разработки

Проект должен развиваться по правилу:

```text
Сначала правильное ядро.
Потом расширение.
Потом оптимизация.
```

Не нужно начинать со сложных функций.

Сначала нужно сделать:

```text
Category
Dish
CafeTable
Order
OrderItem
Payment
```

Потом:

```text
Auth
Staff
Discount
Tip
Reports
Dashboard
```

Потом:

```text
Kitchen
Stock
Delivery
Mobile
Frontend
```

---

## 62. Итог

Cafe Automation System должен стать большим, но понятным проектом.

Главная цель — не просто написать CRUD, а построить правильную основу реальной системы кафе.

Самое важное:

* правильно спроектировать Domain;
* не смешивать слои;
* держать код простым;
* писать понятные services;
* использовать Repository Pattern аккуратно;
* использовать Result Pattern без лишней сложности;
* не писать бизнес-логику в controllers;
* не писать EF Core в Application;
* не загрязнять Domain техническими зависимостями;
* заранее думать о расширении проекта.

```

Я бы этот файл держал как главный документ проекта. После него можно отдельно создать ещё 3 файла: `database-design.md`, `api-endpoints.md`, `development-rules.md`.
```
