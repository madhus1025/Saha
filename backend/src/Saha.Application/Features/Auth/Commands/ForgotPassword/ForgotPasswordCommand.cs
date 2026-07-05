using MediatR;

namespace Saha.Application.Features.Auth.Commands.ForgotPassword;

public sealed record ForgotPasswordCommand(string TogetherIDOrUsername) : IRequest;
