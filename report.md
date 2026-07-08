# Cafe Automation System - Domain Layer Report

## Scope

Prepared only the `Backend/src/Domain` project for the Cafe Automation System backend.

The work was done according to Clean Architecture rules:

- no changes were made in `Api`, `Application`, or `Infrastructure`;
- no EF Core code was added;
- no `DbContext`, repositories, services, controllers, migrations, or external NuGet packages were added;
- the Domain layer uses simple POCO classes with public `get; set;` properties;
- all IDs are `int`, except `IdentityUserId`, which is `string?`;
- all money fields use `decimal`;
- all date fields use `DateTime`;
- required string fields are initialized with `string.Empty`;
- collection properties are initialized with `new List<T>()`;
- nullable fields are explicitly nullable;
- no `required` keyword, records, validation logic, DataAnnotations, or Fluent API were used.

## Created Folders

Inside `Backend/src/Domain`:

- `Common`
- `Entities`
- `Enums`
- `Constants`

## Common Classes

Created:

- `Common/BaseEntity.cs`
  - `int Id`

- `Common/AuditableEntity.cs`
  - inherits from `BaseEntity`
  - `DateTime CreatedAt = DateTime.UtcNow`
  - `DateTime? UpdatedAt`
  - `bool IsDeleted`

## Entities

Created in `Backend/src/Domain/Entities`:

- `Category`
- `Dish`
- `CafeTable`
- `Customer`
- `StaffMember`
- `Order`
- `OrderItem`
- `Payment`
- `Discount`
- `Tip`
- `Reservation`

All entities inherit from `AuditableEntity`.

The entities include the requested scalar fields, nullable relationships, navigation properties, and initialized collections.

## Enums

Created in `Backend/src/Domain/Enums`:

- `DishStatus`
- `DishType`
- `TableStatus`
- `OrderStatus`
- `OrderType`
- `OrderItemStatus`
- `PaymentStatus`
- `PaymentMethod`
- `DiscountType`
- `StaffRole`
- `StaffStatus`
- `ReservationStatus`
- `CustomerStatus`

All enum values were created with the requested explicit integer values.

## Constants

Created:

- `Constants/SystemRoles.cs`

The `SystemRoles` static class contains:

- `Admin`
- `Manager`
- `Waiter`
- `Cashier`
- `Kitchen`
- `All`

## Namespace

The Domain layer uses:

```csharp
Cafe.Domain
```

with sub-namespaces:

```csharp
Cafe.Domain.Common
Cafe.Domain.Entities
Cafe.Domain.Enums
Cafe.Domain.Constants
```

## Dependency Direction

The Domain layer does not depend on:

- `Api`
- `Application`
- `Infrastructure`
- Entity Framework Core
- ASP.NET Identity classes
- external packages

`StaffMember.IdentityUserId` was added as `string?` only for a future optional link to ASP.NET Core Identity.

## Build Result

Command executed:

```powershell
dotnet build Backend\CafeAutomation.slnx
```

Result:

```text
Build succeeded.
0 Warning(s)
0 Error(s)
```

---

# Session 2 — Technical Audit & Repository Pagination Refactor (Specification Pattern)

**Date:** 2026-07-08

This session had two parts: a full technical audit of the backend as it stood, and the start of the fix work for the highest-priority finding from that audit.

## Part 1 — Full Technical Audit

### Method

Scanned the project structure first (`Domain` / `Application` / `Infrastructure` / `Api`) without reading every file line by line, then did targeted reads of entities, services, DTOs, interfaces, EF configurations, `AppDbContext`, `DependencyInjection.cs`, `Program.cs`, and all `.csproj` files to find concrete, file-anchored risk points rather than generic advice.

### Project state established by the audit

- `Domain` and `Application` were substantially built: 10 entities, 10 services, 50+ DTOs, a consistent `Result`/`Result<T>` pattern used everywhere instead of exceptions as control flow.
- `Infrastructure` contained only `Configurations/`, `Data/AppDbContext.cs`, and `DependencyInjection.cs` — no repository implementations, no Identity/JWT implementation, no `IUnitOfWork` implementation, no migrations.
- `Api` was still the unmodified `WebApplication` template (`/weatherforecast` sample) — no controllers, no authentication/authorization wiring, no exception-handling middleware.
- No test project existed anywhere in the solution.
- `Domain.csproj` had zero package/project references (a genuinely clean, dependency-free core), and `Application.csproj` referenced only `Domain` — no EF Core in Application.

### Findings (by category, most significant)

**Architecture**
- ✅ Correct dependency direction Domain ← Application ← Infrastructure ← Api; no EF Core leakage into Application.
- ⚠️ Anemic domain model — all business rules (order status machine, discount calculation) live in service methods, not on entities.
- ❌ No global exception middleware (Api layer not yet built).

**Validation / business rules**
- ✅ Order status machine (`OrderService.CanMoveToStatus`) genuinely guards against skipping steps.
- ✅ Discount calculation validates ranges, zero/negative values, percentage caps.
- ❌ No optimistic concurrency anywhere (`BaseEntity` has no `RowVersion`/concurrency token) — confirmed via project-wide grep — silent lost-update risk between waiter and kitchen editing the same order.
- ❌ Payment creation (`PaymentService.CreateAsync`) has a TOCTOU race: paid-amount check and payment insert are not atomic, no idempotency key — concurrent retries can double-charge.
- ❌ Split-bill not implemented as a feature at all.
- ⚠️ `CancelAsync` blocks cancellation only for fully `Paid` orders, not `PartiallyPaid` — money can be stranded with no refund flow (`PaymentStatus.Refunded` exists as an enum value but nothing ever sets it).

**Authorization / security**
- ❌ RBAC / row-level access not implemented — `ICurrentUserService` is declared but has zero references anywhere in `Application/Services`.
- ⚠️ JWT half-designed — access-token lifetime hardcoded to 1 hour, refresh tokens generated but never persisted/validated/revoked; role changes have no effect on already-issued tokens.
- ✅ No SQL injection surface — EF Core LINQ only, no raw SQL/Dapper anywhere.
- ❌ Sensitive-data leakage by design — `GetStaffMemberDto.Salary` and `GetDishDto.CostPrice` sit on the single shared DTO returned to every caller, with no role-based projection.

**Data / EF Core**
- ❌ **Systemic issue**: every list-returning repository interface (`IOrderRepository.GetAllAsync`, and the same shape on `IStaffMemberRepository`, `IDishRepository`, `IReservationRepository`) returned `Task<List<T>>`. Every corresponding service then filtered/sorted/paginated with LINQ-to-Objects via `PaginationHelper.CreatePagedResult(IEnumerable<T>, ...)` — meaning full-table materialization into application memory on every list call, with all EF-configured indexes never actually reached by SQL. This is what the Part 2 work below fixes.
- ✅ Soft delete implemented correctly and consistently (`IsDeleted` + `HasQueryFilter` in every configuration reviewed).
- ✅ Reasonable indexes already defined (`Status`, `CafeTableId`, `OrderedAt`, `WaiterId`, etc. on `Order`) — undermined in practice by the in-memory materialization above.
- ⚠️ UTC discipline held in code (`DateTime.UtcNow` everywhere) but not enforced at the schema level (no explicit `timestamptz` column typing).

**Analytics / dashboard**
- ✅ Good contract: `IDashboardRepository`/`IReportRepository` return pre-aggregated DTOs, wrapped in `ICacheService` with 2–5 minute TTLs.
- ❓ Could not verify the actual query implementation behind these interfaces — it does not exist yet in `Infrastructure`.

**Other**
- ❌ No audit trail anywhere — no `AuditLog` entity, no `ILogger` calls in any service; e.g. `OrderService.RemoveItemAsync` lets a waiter delete an order item already `Cooking`/`Served` with no guard and no record of who did it.
- ❌ Zero test projects in the solution.

### Fix plan produced (by priority)

- **P0 (critical):** payment idempotency/race condition; optimistic concurrency (`RowVersion`); full-table-materialization in list repositories; sensitive-data leakage in shared DTOs (`Salary`/`CostPrice`).
- **P1 (important):** item-status guards on order mutation + minimal audit trail; refund flow required before cancelling partially-paid orders; kitchen re-sync when items are added late; refresh-token persistence/revoke design; wiring `ICurrentUserService` into row-level filtering; global exception middleware once controllers exist.
- **P2 (nice-to-have):** explicit split-bill feature; explicit `timestamptz` typing; unit tests for the status machine and discount calculation; `AuditLog` entity; adopting FluentValidation to de-duplicate manual validation.

**Estimated production readiness at time of audit: ~20%** (strong Domain/Application foundation, but Infrastructure/Api/security/tests essentially unbuilt).

## Part 2 — P0 #1 Fix: List Repository Pagination

### Initial approach, then a user-directed pivot

The first proposal was to change `GetAllAsync(): Task<List<T>>` → `IQueryable<T>` directly on the Application repository interfaces, referencing `Microsoft.EntityFrameworkCore` from `Application.csproj` for `CountAsync`/`ToListAsync`/`Include`. The user redirected this to a **Specification Pattern** instead — the project is going into both a portfolio and a real production deployment, so architectural cleanliness of the Application layer was prioritized over near-term implementation speed; `Application` should not reference EF Core or `IQueryable` at all.

### Design decisions agreed with the user

1. `ISpecification<T>.Criteria` is a single `Expression<Func<T,bool>>` built once per concrete specification (not accumulated incrementally via repeated `AddCriteria` calls) — avoids needing an expression-tree parameter-rebinding combinator, which would have been the main source of subtle bugs in a from-scratch implementation.
2. `Includes` (typed, one level) + `IncludeStrings` (dot-path strings, e.g. `"Items.Dish"`) together cover both flat and nested eager-loading without a generic `ThenInclude` chain type.
3. Repository contract settled on a single `Task<PagedResult<T>> GetAsync(ISpecification<T> spec, CancellationToken ct)` rather than separate `GetAsync` + `CountAsync` methods — one orchestrated call per list request, no redundant API surface (a standalone `CountAsync(spec)` was deliberately not added since nothing calls it yet).
4. `SpecificationEvaluator<T>` is the **only** place in the entire codebase allowed to touch `IQueryable<T>` / EF Core query operators for this purpose, and it lives in `Infrastructure`, not `Application`.
5. `PagedResult<T>.Create(...)`'s existing signature was left untouched, since it's still used by the old, out-of-scope `PaginationHelper.CreatePagedResult(IEnumerable<T>, ...)` path in `CategoryService`/`CustomerService`/`CafeTableService`. The new path derives `pageNumber`/`pageSize` from `Skip`/`Take` inside the evaluator instead of threading them through separately.
6. Added an optional `PagedResult<TEntity>.MapTo(Func<TEntity,TDto>)` extension (user-approved) to remove the repeated entity→DTO paged-result remap that will otherwise appear in all four services being migrated.
7. Noted and explicitly deferred: `IUnitOfWork` still has no concrete implementation anywhere in `Infrastructure`. Pre-existing gap, unrelated to this refactor; agreed to pick it up as its own follow-up once all four entities are migrated to the Specification Pattern.

### Files created this session — Step 0 (shared contract), completed

All four files were reviewed as a diff and confirmed by the user individually before being written, one at a time.

1. **`Backend/src/Application/Common/Specifications/ISpecification.cs`** — the contract: `Criteria`, `Includes`, `IncludeStrings`, `OrderBy`/`OrderByDescending`, `Skip`/`Take`, `IsPagingEnabled`. Depends on nothing but `System.Linq.Expressions` from the BCL.
2. **`Backend/src/Application/Common/Specifications/BaseSpecification.cs`** — abstract base implementing `ISpecification<T>`; protected `AddInclude` (expression + string overloads), `ApplyOrderBy`/`ApplyOrderByDescending`, `ApplyPaging`; `Criteria` is settable only through the constructor.
3. **`Backend/src/Infrastructure/Specifications/SpecificationEvaluator.cs`** — `GetQuery(IQueryable<T>, ISpecification<T>)` applies `Where`/`Include`/`IncludeStrings`/`OrderBy`/`Skip`-`Take`; `GetPagedResultAsync(...)` runs a `CountAsync` against the filtered-but-unpaged query, a `ToListAsync` against the fully-applied query, derives `pageNumber`/`pageSize` from `Skip`/`Take`, and returns a `PagedResult<T>`.
4. **`Backend/src/Application/Common/PagedResultExtensions.cs`** — the `MapTo<TEntity,TDto>` extension described above.

**Build verified after Step 0:** `dotnet build Backend/CafeAutomation.slnx` → `Build succeeded, 0 Warning(s), 0 Error(s)`. Step 0 is purely additive (no existing file was modified), so this confirms the new contract compiles cleanly against the current codebase.

### Remaining work (planned, not yet started)

Steps 1–4, one entity at a time in this order — **Order → Staff → Dish → Reservation** — each producing:

- `Application/Services/<Entity>/Specifications/<Entity>FilterSpecification.cs` (replaces the current in-service manual filtering, including inlining `ServiceHelpers.BuildCustomerName`/`BuildStaffName` into direct navigation-property comparisons, since arbitrary C# method calls cannot be translated into a SQL expression tree)
- Updated `Application/Interfaces/Repositories/I<Entity>Repository.cs` (`GetAllAsync(ct)` → `GetAsync(ISpecification<T>, ct)`, all other members unchanged)
- New `Infrastructure/Repositories/<Entity>Repository.cs` — first-ever concrete implementation of these repository interfaces, built on `AppDbContext` + `SpecificationEvaluator<T>`
- Updated `Application/Services/<Entity>Service.cs` — `GetAllAsync` rebuilt to construct a specification and call the repository, DTO mapping done in memory over the already-paged page via `MapTo`
- `Infrastructure/DependencyInjection.cs` — DI registration for the new repository

**Explicitly out of scope for this pass:**
- `CategoryService` / `CustomerService` / `CafeTableService` — still on the old in-memory `PaginationHelper.CreatePagedResult(IEnumerable<T>, ...)` path; tracked as a separate backlog item.
- `IUnitOfWork` implementation — tracked as its own follow-up after the Specification Pattern migration is complete for all four entities.

## Part 2 (continued) — Steps 1–4: Order, StaffMember, Dish, Reservation

All four entities were migrated to the Specification Pattern in one continuous pass, building on the Step 0 contract above. Each entity produced the same five-file set: a `<Entity>FilterSpecification`, an updated `I<Entity>Repository` interface, a new `Infrastructure/Repositories/<Entity>Repository.cs`, a rewritten `<Entity>Service.GetAllAsync`, and a `DependencyInjection.cs` registration. The build was verified after each entity individually, so a failure would have been caught and fixed within that entity's scope rather than compounding.

### Step 0 contract correction made during this pass

While building `OrderFilterSpecification`, the compiler raised `CS8603` (possible null reference) on every `AddInclude(x => x.Customer)`-style call, because `Includes` was typed as `List<Expression<Func<T, object>>>` while several navigation properties (`Order.Customer`, `Order.CafeTable`, `Dish.Category`, `Reservation.CafeTable`) are nullable reference types. Fixed at the source — `ISpecification<T>.Includes` and `BaseSpecification<T>.AddInclude` were retyped to `Expression<Func<T, object?>>` — rather than letting the same warning resurface for Dish and Reservation. Purely a nullable-annotation correction; no behavioral change, and EF Core's `Include()` unwraps the boxing conversion the same way regardless.

### Files created / modified per entity

| Entity | New files | Modified files | Build |
|---|---|---|---|
| Order | `Application/Services/Orders/Specifications/OrderFilterSpecification.cs`, `Infrastructure/Repositories/OrderRepository.cs` | `Application/Interfaces/Repositories/IOrderRepository.cs`, `Application/Services/OrderService.cs`, `Infrastructure/DependencyInjection.cs` | ✅ 0 warnings / 0 errors |
| StaffMember | `Application/Services/Staff/Specifications/StaffMemberFilterSpecification.cs`, `Infrastructure/Repositories/StaffMemberRepository.cs` | `Application/Interfaces/Repositories/IStaffMemberRepository.cs`, `Application/Services/StaffMemberService.cs`, `Infrastructure/DependencyInjection.cs` | ✅ 0 warnings / 0 errors |
| Dish | `Application/Services/Dishes/Specifications/DishFilterSpecification.cs`, `Infrastructure/Repositories/DishRepository.cs` | `Application/Interfaces/Repositories/IDishRepository.cs`, `Application/Services/DishService.cs`, `Infrastructure/DependencyInjection.cs` | ✅ 0 warnings / 0 errors |
| Reservation | `Application/Services/Reservations/Specifications/ReservationFilterSpecification.cs`, `Infrastructure/Repositories/ReservationRepository.cs` | `Application/Interfaces/Repositories/IReservationRepository.cs`, `Application/Services/ReservationService.cs`, `Infrastructure/DependencyInjection.cs` | ✅ 0 warnings / 0 errors |

Each repository implementation is the **first concrete implementation these interfaces ever had** — `Infrastructure/Repositories/` did not exist before this pass. Every existing interface member (not just the new `GetAsync`) had to be implemented for the classes to compile, e.g. `Order.GetByIdWithDetailsAsync` (full navigation graph incl. `Items.Dish`, `Payments`, `Discounts`, `Tips`), `Dish.GetByIdWithCategoryAsync`, `StaffMember.EmailExistsAsync`/`PhoneExistsAsync`, `Reservation.HasConflictAsync`.

### Translation nuances surfaced while porting in-memory filters to `Expression<Func<T,bool>>`

- **Order** — the original search matched customer/waiter names via `ServiceHelpers.BuildCustomerName`/`BuildStaffName` (string-join with a phone/email fallback only when the joined name was blank). Arbitrary C# method calls cannot appear inside a translatable expression tree, so this was rewritten as an independent OR across `Customer.FirstName`/`LastName`/`Phone`/`Email` and `Waiter.FirstName`/`LastName`/`MiddleName`. This is a **behavioral widening**, not a 1:1 port: the new version matches on phone/email even when the customer's name is also present, which the original fallback-only logic did not do.
- **StaffMember — flagged as needing a decision, not silently resolved.** The original list was sorted `OrderBy(LastName).ThenBy(FirstName)`. The Step 0 `ISpecification<T>` contract only supports a single `OrderBy`/`OrderByDescending` expression — no secondary sort key was designed in. Implemented as `OrderBy(LastName)` only; the `ThenBy(FirstName)` tie-break among staff sharing a last name was dropped rather than approximated. Two ways forward: accept single-key sort, or extend `ISpecification<T>` with a secondary sort key (would touch all four specifications). Left open for the user to decide.
- **Reservation — `HasConflictAsync` is new business logic, not a ported filter.** This interface method existed from the start but had never been implemented anywhere, so booking-conflict detection has never actually run in this codebase before. The implementation written here assumes: a reservation with no `ReservedUntil` is treated as a zero-length booking at `ReservedAt` (start == end), and `Cancelled`/`Completed` reservations never block a slot. Neither rule was documented anywhere prior to this session — flagged explicitly for the user to confirm or correct before this is relied on.
- **StaffMember / Reservation — `GetByIdAsync` eager-loading was an authored judgment call.** Neither interface had a separate `GetByIdWithDetailsAsync`-style method (unlike Order and Dish, which already did), yet `StaffMemberService.GetByIdAsync`/`ReservationService.GetByIdAsync` (left untouched) reuse the same `MapToDto` as the list endpoint, which needs `StaffMember.Orders`/`Tips` and `Reservation.CafeTable` respectively. Chose to `.Include(...)` those directly in the general-purpose `GetByIdAsync` rather than add a new interface member — correct for the detail-view callers, but means other callers of the same method (e.g. waiter/cashier validation lookups inside `OrderService`) now pull extra data they don't need. Low-cost, but a deliberate scope decision made while writing a previously-nonexistent method, not a mechanical port.
- **Minor, non-blocking:** `.Contains(search, StringComparison.OrdinalIgnoreCase)` became `.ToLower().Contains(search.ToLower())` throughout (culture-edge-case differences not relevant to this dataset); SQL `LIKE` wildcard characters (`%`, `_`) in a search term are not escaped, so they now act as real wildcards once translated to SQL; `Dish.IsUsedInOrdersAsync` (implemented for the first time) relies on `OrderItem`'s global soft-delete query filter rather than an explicit `!IsDeleted` check.

### Still explicitly out of scope

`CategoryService`/`CustomerService`/`CafeTableService` remain on the old in-memory `PaginationHelper.CreatePagedResult(IEnumerable<T>, ...)` path. `IUnitOfWork`, `ICategoryRepository`, `ICustomerRepository`, `ICafeTableRepository`, `IPaymentRepository`, `IDiscountRepository`, and `ITipRepository` still have no concrete implementations, so the DI container still cannot fully resolve `OrderService` (or several others) at runtime — `dotnet build` is clean, but `dotnet run` plus a real end-to-end call is not yet expected to work. Not a regression introduced by this pass.

### Final build

```powershell
dotnet clean Backend/CafeAutomation.slnx
dotnet build Backend/CafeAutomation.slnx
```

```text
Build succeeded.
0 Warning(s)
0 Error(s)
```

## Part 3 — Closing out Infrastructure: open decisions, IUnitOfWork, and the remaining six repositories

This pass closed the two open questions left at the end of Part 2 and implemented every remaining piece needed for `dotnet run` to bring the host up without a DI resolution failure.

### Open decision 1 — StaffMember secondary sort key

The `ISpecification<T>` contract from Step 0 only supported a single `OrderBy`/`OrderByDescending`. Extended it with `ThenBy`/`ThenByDescending` (`Expression<Func<T, object>>?`), mirroring the existing pair rather than inventing a new shape:

- `ISpecification<T>` — added `ThenBy`/`ThenByDescending` properties.
- `BaseSpecification<T>` — added `ApplyThenBy`/`ApplyThenByDescending` protected setters.
- `SpecificationEvaluator<T>.GetQuery` — after `OrderBy`/`OrderByDescending` produces an `IOrderedQueryable<T>`, a private `ApplyThenBy` helper conditionally chains `.ThenBy()`/`.ThenByDescending()`. `ThenBy` is structurally only reachable once a primary order exists, since it's chained off the `IOrderedQueryable<T>` returned by `OrderBy`/`OrderByDescending` — there's no code path where it could apply without a primary sort.

Applied to exactly one place, as scoped: `StaffMemberFilterSpecification` now calls `ApplyOrderBy(x => x.LastName)` followed by `ApplyThenBy(x => x.FirstName)`, restoring the original `OrderBy(LastName).ThenBy(FirstName)` behavior. `OrderFilterSpecification`, `DishFilterSpecification`, and `ReservationFilterSpecification` were left untouched — none of them had a secondary sort key in the original in-memory code.

### Open decision 2 — Reservation booking buffer

`ReservationRepository.HasConflictAsync` now enforces a 15-minute buffer between bookings on the same table:

```csharp
private const int BufferMinutes = 15;
```

Placed as a `private const` directly inside `ReservationRepository`, not in `appsettings`/an `IOptions` class — nothing else in the codebase reads this value, and there's no configuration-binding plumbing set up anywhere yet to justify introducing one for a single constant. The overlap check expands the *requested* interval by the buffer on both ends (`[reservedAt - 15min, effectiveEnd + 15min]`) and tests that against each existing active reservation's own (unexpanded) interval — mathematically equivalent to requiring at least a 15-minute gap between any two bookings on the same table. This still sits on top of the same authored assumption flagged in Part 2 (a missing `ReservedUntil` is treated as a zero-length booking, `Cancelled`/`Completed` reservations never block) — that assumption has not been separately re-confirmed, only extended with the buffer.

### IUnitOfWork

`Infrastructure/UnitOfWork.cs` — a single-line wrapper around `AppDbContext.SaveChangesAsync`. No manual `BeginTransaction`/`TransactionScope` was added: every service method audited in Part 1/2 stages all its changes on one injected `AppDbContext` and calls `SaveChangesAsync` exactly once per operation, which EF Core already wraps in an implicit atomic transaction. No scenario surfaced anywhere in the codebase where a single logical operation spans two different `DbContext` instances, so there was nothing to justify more than this.

### The remaining six repositories

Implemented with **no** Specification Pattern / `IQueryable` exposure, per explicit scope — these six services (`CategoryService`, `CustomerService`, `CafeTableService`, and the read paths of `PaymentService`/`DiscountService`/`TipService`) stay on the old in-memory `PaginationHelper.CreatePagedResult(IEnumerable<T>, ...)` path, tracked as its own future backlog item:

| Repository | Interface members implemented | Notes |
|---|---|---|
| `CategoryRepository` | `GetAllAsync`, `GetByIdAsync`, `GetByIdWithDishesAsync`, `AddAsync`, `Update`, `Delete`, `ExistsAsync`, `NameExistsAsync`, `HasActiveDishesAsync` | See "Include decisions" and "Business-rule interpretation" below |
| `CustomerRepository` | `GetAllAsync`, `GetByIdAsync`, `AddAsync`, `Update`, `Delete`, `ExistsAsync`, `PhoneExistsAsync`, `EmailExistsAsync` | See "Include decisions" below |
| `CafeTableRepository` | `GetAllAsync`, `GetByIdAsync`, `AddAsync`, `Update`, `Delete`, `ExistsAsync`, `TableNumberExistsAsync` | No navigation properties needed anywhere — `CafeTableService.MapToDto` reads only scalar fields |
| `PaymentRepository` | `GetAllAsync`, `GetByIdAsync`, `GetByOrderIdAsync`, `AddAsync`, `Update`, `Delete`, `GetPaidAmountByOrderIdAsync` | See "Unused interface members" below |
| `DiscountRepository` | `GetByIdAsync`, `GetByOrderIdAsync`, `AddAsync`, `Update`, `Delete` | See "Include decisions" below |
| `TipRepository` | `GetByIdAsync`, `GetByOrderIdAsync`, `AddAsync`, `Update`, `Delete` | See "Include decisions" below |

All six registered in `Infrastructure/DependencyInjection.cs` alongside `IUnitOfWork`.

### Include decisions — the same judgment call as Part 2's StaffMember/Reservation, applied consistently

The policy carried over from Part 2: when a repository method's result flows directly into that service's own (untouched) `MapToDto`, the navigation properties `MapToDto` reads were `.Include()`-d so the existing mapping code actually produces correct data. Where the interface already provides a separate, more specific method (`GetByIdWithDishesAsync` next to `GetByIdAsync`), the plain method was left un-included, preserving the light/detailed distinction the interface's own shape implies.

- **Category** — `GetAllAsync` and `GetByIdWithDishesAsync` both `.Include(x => x.Dishes)` (needed for `DishesCount` in `MapToDto`). Plain `GetByIdAsync` does **not** include `Dishes`. Flagging explicitly: `CategoryService.UpdateAsync` and `CategoryService.DeleteAsync` both fetch via the plain `GetByIdAsync` and then call `MapToDto` on that same result — meaning the `GetCategoryDto` returned from those two operations will show `DishesCount: 0` regardless of the category's real dish count. This is a **pre-existing gap in `CategoryService` itself** (not touched in this session) — widening the plain `GetByIdAsync`'s `Include` to paper over it would erase the only reason the interface has two separate methods, so it was left as-is and is called out here instead of silently "fixed" by guessing which behavior was intended.
- **Customer** — both `GetAllAsync` and `GetByIdAsync` `.Include(x => x.Orders)` (needed for `OrdersCount`). No separate detailed method exists for Customer at all, so both had to carry it.
- **Discount** — `GetByOrderIdAsync` `.Include(x => x.Order)` (needed for `OrderNumber` in `MapToDto`, called from `DiscountService.GetByOrderIdAsync`). Plain `GetByIdAsync` does not include `Order` — its only caller, `DiscountService.DeleteAsync`, never maps the result to a DTO.
- **Tip** — `GetByOrderIdAsync` `.Include(x => x.Order).Include(x => x.StaffMember)` (needed for `OrderNumber`/`StaffMemberName`, called from `TipService.GetByOrderIdAsync`). Plain `GetByIdAsync` left un-included for the same reason as Discount.
- **Payment** — see "Unused interface members" immediately below; `GetAllAsync`/`GetByIdAsync` were given the same `Include(Order).Include(Cashier)` shape as `GetByOrderIdAsync` purely for internal consistency across three structurally identical listing methods on the same entity, not because any caller currently needs it.

### Unused interface members — flagged rather than guessed

- **`IPaymentRepository.GetAllAsync`, `GetByIdAsync`, `Update`, `Delete`** are not called anywhere in `PaymentService` (verified — `PaymentService` only calls `GetByOrderIdAsync`, `AddAsync`, and `GetPaidAmountByOrderIdAsync`). Implemented faithfully against the interface contract, but their `Include` shape is unverified against any real call site since none currently exists.
- **`PaymentService.CreateAsync` and `TipService.AddAsync` build their entity in memory** (`new Payment { ..., Order = order, ... }` / `new Tip { ..., Order = order, ... }`) and never set the `.Cashier` / `.StaffMember` navigation, even though `CashierId` / `StaffMemberId` is set. Their own `MapToDto` calls (`ServiceHelpers.BuildStaffName(payment.Cashier)` / `BuildStaffName(tip.StaffMember)`) will therefore render an empty name immediately after creation, even though the ID was stored correctly. This is a **pre-existing gap in those two service methods** — not reachable or fixable from the repository layer, since the entity is never re-fetched through a repository call in that code path. Flagged, not touched (`PaymentService.cs`/`TipService.cs` were out of scope for this session).

### Business-rule interpretation made without an explicit spec

`CategoryRepository.HasActiveDishesAsync` interprets "active" as `Dish.Status == DishStatus.Active` — chosen because that exact enum value already exists and is used with that meaning elsewhere (`DishService.DeleteAsync` sets `Status = DishStatus.Archived` on soft-delete). Not a blind guess, but also never explicitly specified anywhere as the definition of "active" for this particular guard (`CategoryService.DeleteAsync`'s "category has active dishes" check) — noted in case a different definition (e.g. also requiring `IsAvailable == true`) was intended.

### Files touched outside the originally scoped list — and why

Making `dotnet run` a meaningful check (rather than one that trivially passes because nothing is wired up) required two files not on the original list:

- **`Backend/src/Api/Program.cs`** — added `builder.Services.AddInfrastructure(builder.Configuration);`. Without this, `AddInfrastructure`'s registrations (everything built in this session, plus Part 2's four Specification-based repositories) would never actually enter the application's DI container, and the run-verification step would have been checking nothing.
- **`Backend/src/Api/appsettings.Development.json`** — added a `ConnectionStrings:DefaultConnection` entry (`Host=localhost;Port=5432;Database=cafe_automation;Username=postgres;Password=postgres`, a local-dev placeholder, not a secret). `AddInfrastructure` throws `InvalidOperationException` immediately at startup if this key is missing, which it was.

Neither change touches `appsettings.json` (production config remains unset, as it should).

### Run verification

```powershell
dotnet run --project Backend/src/Api/Api.csproj --no-build --urls http://localhost:5299
```

```text
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5299
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
```

No DI resolution exceptions. Followed up with an actual HTTP request against the running host rather than just checking the process didn't crash:

```text
GET http://localhost:5299/weatherforecast → HTTP 200
```

**Caveat, stated plainly:** this confirms the DI container now builds successfully and the host serves a request — it does **not** mean every service in the codebase is resolvable. `AuthService` (needs `IIdentityService`/`ITokenService`), `DashboardService`/`ReportService` (need `IDashboardRepository`/`IReportRepository`), and `ICacheService` still have zero implementations. `dotnet run` succeeds only because `Program.cs` still has no controllers requesting any of them at startup — the moment a controller or minimal-API endpoint is added that resolves `IAuthService` (etc.) through DI, that specific request would fail. Everything that was in this session's explicit scope (`IUnitOfWork` + the ten repository interfaces across both Part 2 and Part 3) is now implemented and registered.

### Final build and run status

```text
dotnet build Backend/CafeAutomation.slnx → Build succeeded. 0 Warning(s). 0 Error(s).
dotnet run (Api, --no-build)             → Host started, GET /weatherforecast → 200 OK.
```
