using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationPreOrderAndKitchenTiming : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_CafeTableId",
                table: "Orders");

            migrationBuilder.AddColumn<int>(
                name: "ReservationId",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SendToKitchenAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ActiveByReservation",
                table: "Orders",
                column: "ReservationId",
                unique: true,
                filter: "\"ReservationId\" IS NOT NULL AND \"Status\" != 7 AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ActiveByTable",
                table: "Orders",
                column: "CafeTableId",
                unique: true,
                filter: "\"CafeTableId\" IS NOT NULL AND \"Status\" NOT IN (6,7,8) AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status_SendToKitchenAt",
                table: "Orders",
                columns: new[] { "Status", "SendToKitchenAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Reservations_ReservationId",
                table: "Orders",
                column: "ReservationId",
                principalTable: "Reservations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Reservations_ReservationId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ActiveByReservation",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ActiveByTable",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_Status_SendToKitchenAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReservationId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SendToKitchenAt",
                table: "Orders");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CafeTableId",
                table: "Orders",
                column: "CafeTableId");
        }
    }
}
