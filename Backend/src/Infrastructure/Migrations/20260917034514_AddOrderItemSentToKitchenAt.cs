using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemSentToKitchenAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SentToKitchenAt",
                table: "OrderItems",
                type: "timestamp with time zone",
                nullable: true);

            // Backfill for orders that already existed before this column: under the old model
            // any order that wasn't Scheduled (8) was immediately kitchen-visible, so its items
            // must not suddenly disappear from the kitchen board just because this column is new
            // and null-by-default. Only a still-open Draft (9) or not-yet-due Scheduled (8) order
            // genuinely has nothing sent yet - everything else (New/Accepted/Cooking/Ready/
            // Served/Closed/Cancelled) is treated as already sent, stamped with the item's own
            // OrderedAt-equivalent (CreatedAt, since OrderItem has no OrderedAt of its own).
            migrationBuilder.Sql(@"
                UPDATE ""OrderItems"" oi
                SET ""SentToKitchenAt"" = oi.""CreatedAt""
                FROM ""Orders"" o
                WHERE oi.""OrderId"" = o.""Id""
                  AND o.""Status"" NOT IN (8, 9);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SentToKitchenAt",
                table: "OrderItems");
        }
    }
}
