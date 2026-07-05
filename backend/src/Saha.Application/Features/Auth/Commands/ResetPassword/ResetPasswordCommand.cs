using MediatR;

namespace Saha.Application.Features.Auth.Commands.ResetPassword;

public sealed record ResetPasswordCommand(
    string TogetherIDOrUsername,
    string Code,
    string NewPassword,
    string ConfirmPassword) : IRequest;
