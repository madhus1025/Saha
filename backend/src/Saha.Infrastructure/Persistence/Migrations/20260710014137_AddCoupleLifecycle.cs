using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCoupleLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Partners_CoupleId",
                table: "Partners");

            // Every couple that predates this migration has both partners, so it is Complete.
            // The default also guards the column against an insert that forgets to set it — an empty
            // string would deserialise to an invalid CoupleState.
            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Couples",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Complete");

            migrationBuilder.Sql("UPDATE Couples SET State = 'Complete' WHERE State IS NULL OR State = '';");

            migrationBuilder.CreateTable(
                name: "CoupleInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CoupleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InviteeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InviteeEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoupleInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoupleInvitations_Couples_CoupleId",
                        column: x => x.CoupleId,
                        principalTable: "Couples",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Partners_CoupleId_Role",
                table: "Partners",
                columns: new[] { "CoupleId", "Role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoupleInvitations_CoupleId",
                table: "CoupleInvitations",
                column: "CoupleId");

            migrationBuilder.CreateIndex(
                name: "IX_CoupleInvitations_TokenHash",
                table: "CoupleInvitations",
                column: "TokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoupleInvitations");

            migrationBuilder.DropIndex(
                name: "IX_Partners_CoupleId_Role",
                table: "Partners");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Couples");

            migrationBuilder.CreateIndex(
                name: "IX_Partners_CoupleId",
                table: "Partners",
                column: "CoupleId");
        }
    }
}
