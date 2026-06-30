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
