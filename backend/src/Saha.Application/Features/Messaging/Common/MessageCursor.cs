using System.Text;

namespace Saha.Application.Features.Messaging.Common;

/// <summary>
/// Opaque cursor for newest-first message pagination, encoding the boundary message's
/// (CreatedAt ticks, Id) so ties on timestamp still paginate deterministically.
/// </summary>
public static class MessageCursor
{
    public static string Encode(DateTime createdAt, Guid id)
    {
        var raw = $"{createdAt.Ticks}:{id}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    }

    public static bool TryDecode(string? cursor, out long ticks, out Guid id)
    {
        ticks = 0;
        id = Guid.Empty;

        if (string.IsNullOrWhiteSpace(cursor))
            return false;

        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var parts = raw.Split(':', 2);
            return parts.Length == 2
                && long.TryParse(parts[0], out ticks)
                && Guid.TryParse(parts[1], out id);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
