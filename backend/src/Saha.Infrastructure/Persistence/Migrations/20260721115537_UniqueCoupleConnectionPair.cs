using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UniqueCoupleConnectionPair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CoupleConnections_CoupleAId_CoupleBId",
                table: "CoupleConnections");

            migrationBuilder.CreateIndex(
                name: "IX_CoupleConnections_CoupleAId_CoupleBId",
                table: "CoupleConnections",
                columns: new[] { "CoupleAId", "CoupleBId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CoupleConnections_CoupleAId_CoupleBId",
                table: "CoupleConnections");

            migrationBuilder.CreateIndex(
                name: "IX_CoupleConnections_CoupleAId_CoupleBId",
                table: "CoupleConnections",
                columns: new[] { "CoupleAId", "CoupleBId" });
        }
    }
}
