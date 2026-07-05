namespace Saha.Application.Common.Exceptions;

public sealed class ApplicationValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ApplicationValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }
}

public sealed class NotFoundException : Exception
{
    public NotFoundException(string resourceName, object key)
        : base($"{resourceName} with key '{key}' was not found.") { }
}

public sealed class UnauthorizedException : Exception
{
    public UnauthorizedException(string message = "Unauthorized.") : base(message) { }
}

public sealed class ForbiddenException : Exception
{
    public ForbiddenException(string message = "Forbidden.") : base(message) { }
}

public sealed class ConflictException : Exception
{
    public string ConflictCode { get; }

    public ConflictException(string code, string message) : base(message)
    {
        ConflictCode = code;
    }
}
