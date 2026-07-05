namespace Saha.Application.Common.Interfaces;

public record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    string PlainTextBody);

public interface IEmailService
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
    Task SendToMultipleAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default);
}
