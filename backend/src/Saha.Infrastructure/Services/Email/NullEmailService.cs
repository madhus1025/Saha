using Microsoft.Extensions.Logging;
using Saha.Application.Common.Interfaces;

namespace Saha.Infrastructure.Services.Email;

// Used in development when SMTP is not configured — logs emails to console instead of sending them
public class NullEmailService(ILogger<NullEmailService> logger) : IEmailService
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
            message.To, message.Subject, message.PlainTextBody);
        return Task.CompletedTask;
    }

    public Task SendToMultipleAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default)
    {
        foreach (var message in messages)
        {
            logger.LogInformation(
                "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
                message.To, message.Subject, message.PlainTextBody);
        }
        return Task.CompletedTask;
    }
}
