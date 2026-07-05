using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.ResetPassword;

public sealed class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public ResetPasswordCommandHandler(
        ICoupleRepository coupleRepository,
        IPasswordHasher passwordHasher,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _passwordHasher = passwordHasher;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var input = request.TogetherIDOrUsername.Trim();

        // Look up couple ID first, then reload with tokens so reset tokens are available
        var lookup = await _coupleRepository.GetByTogetherIDAsync(input.ToUpperInvariant(), cancellationToken)
                     ?? await _coupleRepository.GetByUsernameAsync(input.ToLowerInvariant(), cancellationToken);

        if (lookup is null || !lookup.IsActive)
            throw new UnauthorizedException("Invalid or expired verification code.");

        var couple = await _coupleRepository.GetByIdWithTokensAsync(lookup.Id, cancellationToken);

        if (couple is null)
            throw new UnauthorizedException("Invalid or expired verification code.");

        var resetToken = couple.FindActiveResetToken(request.Code, _passwordHasher);

        if (resetToken is null)
        {
            await _auditLogger.LogAsync(
                action: "PASSWORD_RESET_FAILED",
                isSuccess: false,
                coupleId: couple.Id,
                details: "Invalid or expired code",
                ipAddress: _currentUser.IpAddress,
                errorCode: "INVALID_RESET_CODE",
                cancellationToken: cancellationToken);

            throw new UnauthorizedException("Invalid or expired verification code.");
        }

        var newPasswordHash = _passwordHasher.Hash(request.NewPassword);
        couple.ChangePassword(newPasswordHash);
        resetToken.MarkAsUsed();

        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "PASSWORD_RESET_SUCCESS",
            isSuccess: true,
            coupleId: couple.Id,
            details: "Password successfully reset",
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
