using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTableFloorPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Height",
                table: "CafeTables",
                type: "double precision",
                nullable: false,
                defaultValue: 80.0);

            migrationBuilder.AddColumn<double>(
                name: "PositionX",
                table: "CafeTables",
                type: "double precision",
                nullable: false,
                defaultValue: 40.0);

            migrationBuilder.AddColumn<double>(
                name: "PositionY",
                table: "CafeTables",
                type: "double precision",
                nullable: false,
                defaultValue: 40.0);

            migrationBuilder.AddColumn<int>(
                name: "Shape",
                table: "CafeTables",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<double>(
                name: "Width",
                table: "CafeTables",
                type: "double precision",
                nullable: false,
                defaultValue: 80.0);

            migrationBuilder.AddColumn<int>(
                name: "ZoneId",
                table: "CafeTables",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Zones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Zones", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CafeTables_ZoneId",
                table: "CafeTables",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Zones_IsDeleted",
                table: "Zones",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Zones_Name",
                table: "Zones",
                column: "Name",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_CafeTables_Zones_ZoneId",
                table: "CafeTables",
                column: "ZoneId",
                principalTable: "Zones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CafeTables_Zones_ZoneId",
                table: "CafeTables");

            migrationBuilder.DropTable(
                name: "Zones");

            migrationBuilder.DropIndex(
                name: "IX_CafeTables_ZoneId",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "PositionX",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "PositionY",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "Shape",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "CafeTables");

            migrationBuilder.DropColumn(
                name: "ZoneId",
                table: "CafeTables");
        }
    }
}
