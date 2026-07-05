using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Saha.Application.Common.Interfaces;
using System.Net;
using System.Net.Mail;

namespace Saha.Infrastructure.Services.Email;

public sealed class SmtpEmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<SmtpSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = BuildClient();
            using var mail = BuildMailMessage(message);
            await client.SendMailAsync(mail, cancellationToken);
            _logger.LogInformation("Email sent to {To} — {Subject}", message.To, message.Subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", message.To);
            throw;
        }
    }

    public async Task SendToMultipleAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default)
    {
        using var client = BuildClient();
        foreach (var message in messages)
        {
            try
            {
                using var mail = BuildMailMessage(message);
                await client.SendMailAsync(mail, cancellationToken);
                _logger.LogInformation("Email sent to {To}", message.To);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", message.To);
            }
        }
    }

    private SmtpClient BuildClient()
    {
        var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };
        if (!string.IsNullOrWhiteSpace(_settings.Username))
            client.Credentials = new NetworkCredential(_settings.Username, _settings.Password);
        return client;
    }

    private MailMessage BuildMailMessage(EmailMessage message) =>
        new(_settings.SenderEmail, message.To, message.Subject, message.HtmlBody)
        {
            IsBodyHtml = true,
            From = new MailAddress(_settings.SenderEmail, _settings.SenderName),
        };
}

public sealed class SmtpSettings
{
    public string Host { get; set; } = default!;
    public int Port { get; set; } = 587;
    public bool UseSsl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string SenderEmail { get; set; } = default!;
    public string SenderName { get; set; } = "Saha";
}
