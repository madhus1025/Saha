using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Saha.Application.Common.Interfaces;
using Saha.Application.Telemetry;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IEmailService _emailService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;
    private readonly AuthMetrics _authMetrics;
    private readonly ILogger<ForgotPasswordCommandHandler> _logger;

    public ForgotPasswordCommandHandler(
        ICoupleRepository coupleRepository,
        IEmailService emailService,
        IPasswordHasher passwordHasher,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration,
        AuthMetrics authMetrics,
        ILogger<ForgotPasswordCommandHandler> logger)
    {
        _coupleRepository = coupleRepository;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
        _authMetrics = authMetrics;
        _logger = logger;
    }

    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        _authMetrics.RecordForgotPasswordRequest();

        var input = request.TogetherIDOrUsername.Trim();

        var couple = input.Contains('-')
            ? await _coupleRepository.GetByIdWithTokensAsync(
                Guid.Empty, cancellationToken) // placeholder — actual lookup below
            : null;

        // Try Together ID first, then username
        couple = await _coupleRepository.GetByTogetherIDAsync(input.ToUpperInvariant(), cancellationToken)
                 ?? await _coupleRepository.GetByIdWithTokensAsync(
                     (await _coupleRepository.GetByUsernameAsync(input.ToLowerInvariant(), cancellationToken))?.Id
                     ?? Guid.Empty, cancellationToken);

        // Always return success to prevent enumeration attacks
        if (couple is null || !couple.IsActive) return;

        var code = GenerateSixDigitCode();
        var codeHash = _passwordHasher.Hash(code);
        var ttlMinutes = _configuration.GetValue("PasswordReset:TokenTtlMinutes", 15);
        var expiry = DateTime.UtcNow.AddMinutes(ttlMinutes);

        couple.CreatePasswordResetToken(codeHash, expiry);
        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        // Address only the partners that exist: a couple awaiting its partner has just one.
        var emailMessages = couple.Partners
            .Select(partner => new EmailMessage(
                To: partner.Email,
                Subject: "Saha — Password Reset Code",
                HtmlBody: BuildEmailHtml(code, partner.Name, ttlMinutes),
                PlainTextBody: BuildEmailText(code, partner.Name, ttlMinutes)))
            .ToArray();

        // ── Email send with accurate latency measurement ─────────────────────
        _authMetrics.RecordResetEmailTriggered(emailMessages.Length);
        var emailSw = Stopwatch.StartNew();
        try
        {
            await _emailService.SendToMultipleAsync(emailMessages, cancellationToken);
            emailSw.Stop();
            _authMetrics.RecordResetEmailSent(emailMessages.Length, emailSw.Elapsed.TotalMilliseconds);
            _authMetrics.RecordForgotPasswordSuccess();
        }
        catch (Exception ex)
        {
            emailSw.Stop();
            _authMetrics.RecordResetEmailFailed(emailMessages.Length, emailSw.Elapsed.TotalMilliseconds);
            _logger.LogError(ex,
                "Failed to send password-reset emails for CoupleId={CoupleId} after {ElapsedMs}ms",
                couple.Id, emailSw.ElapsedMilliseconds);
            // Do not rethrow: the HTTP response must be 204 (enumeration-attack prevention)
        }

        await _auditLogger.LogAsync(
            action: "PASSWORD_RESET_REQUESTED",
            isSuccess: true,
            coupleId: couple.Id,
            details: $"Reset code sent to both partners",
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }

    private static string GenerateSixDigitCode() =>
        Random.Shared.Next(100000, 999999).ToString();

    private static string BuildEmailHtml(string code, string name, int ttlMinutes) => $"""
        <html><body style="font-family: Georgia, serif; color: #3d2b1f; background: #faf8f5; padding: 40px;">
          <h2 style="color: #8B6914;">Saha</h2>
          <p>Dear {name},</p>
          <p>Your password reset code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #C4860A; margin: 24px 0;">{code}</div>
          <p>This code expires in <strong>{ttlMinutes} minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p style="color: #888; font-size: 12px; margin-top: 40px;">— The Saha Team</p>
        </body></html>
        """;

    private static string BuildEmailText(string code, string name, int ttlMinutes) =>
        $"Dear {name},\n\nYour Saha password reset code is: {code}\n\nThis code expires in {ttlMinutes} minutes.\n\nIf you didn't request this, please ignore this email.\n\n— The Saha Team";
}
