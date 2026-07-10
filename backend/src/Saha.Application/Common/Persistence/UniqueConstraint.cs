using Microsoft.EntityFrameworkCore;

namespace Saha.Application.Common.Persistence;

/// <summary>
/// Recognises a unique-index violation without binding to a database provider. Registration checks
/// availability before inserting, but that is a courtesy, not a guarantee: two registrations can
/// claim the same TogetherID between the check and the insert. The index is what actually decides,
/// and losing that race must surface as a 409, never a 500.
/// </summary>
public static class UniqueConstraint
{
    public static bool IsViolation(Exception exception)
    {
        if (exception is not DbUpdateException) return false;

        for (Exception? inner = exception.InnerException; inner is not null; inner = inner.InnerException)
        {
            var message = inner.Message;

            // SQLite: "UNIQUE constraint failed: Couples.TogetherID"
            // SQL Server 2627/2601: "Violation of UNIQUE KEY constraint" / "Cannot insert duplicate key row"
            if (message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("Violation of UNIQUE KEY", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
