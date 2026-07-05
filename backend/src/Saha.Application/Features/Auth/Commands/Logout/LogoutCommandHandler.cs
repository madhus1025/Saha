using MediatR;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Commands.Logout;

public sealed class LogoutCommandHandler : IRequestHandler<LogoutCommand>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public LogoutCommandHandler(
        ICoupleRepository coupleRepository,
        ITokenService tokenService,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _tokenService = tokenService;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = _tokenService.HashToken(request.RefreshToken);
        var couple = await _coupleRepository.GetByRefreshTokenHashAsync(tokenHash, cancellationToken);

        if (couple is not null)
        {
            couple.RevokeRefreshToken(tokenHash, "Logout");
            await _coupleRepository.UpdateAsync(couple, cancellationToken);

            await _auditLogger.LogAsync(
                action: "LOGOUT",
                isSuccess: true,
                coupleId: couple.Id,
                partnerId: _currentUser.IsAuthenticated ? _currentUser.PartnerId : null,
                ipAddress: _currentUser.IpAddress,
                cancellationToken: cancellationToken);
        }
    }
}
