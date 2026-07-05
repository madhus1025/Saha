using Saha.Domain.Interfaces.Services;

namespace Saha.Infrastructure.Services;

public sealed class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}
