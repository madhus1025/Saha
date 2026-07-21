using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Saha.API.Serialization;

/// <summary>
/// Serializes every <see cref="DateTime"/> as an ISO-8601 instant with an explicit UTC offset
/// (a trailing <c>Z</c>).
/// <para>
/// Timestamps read back from the database arrive with <see cref="DateTimeKind.Unspecified"/> — the
/// values are UTC, but System.Text.Json then writes them without any offset (e.g.
/// <c>2026-07-20T17:14:04.566</c>). A browser parses an offset-less string as <b>local</b> time, so
/// in any non-UTC timezone every message/conversation/connection time is wrong (a just-sent message
/// reads "5h" in IST instead of "now"). Treating <c>Unspecified</c> as UTC and always emitting the
/// offset fixes every client at once.
/// </para>
/// System.Text.Json applies a registered <see cref="JsonConverter{DateTime}"/> to
/// <see cref="Nullable{DateTime}"/> as well, so nullable timestamps are covered too.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

        // "O" round-trip format for a UTC DateTime always ends with the "Z" designator.
        writer.WriteStringValue(utc.ToString("O", CultureInfo.InvariantCulture));
    }
}
