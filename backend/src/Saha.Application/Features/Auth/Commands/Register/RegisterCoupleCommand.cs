using MediatR;
using Saha.Application.Features.Auth.Common;
using Saha.Domain.Enums;

namespace Saha.Application.Features.Auth.Commands.Register;

/// <summary>
/// Creates a couple from the registrant's half only. The second partner supplies their own details
/// when they accept an invitation — nobody ever types for their partner.
/// </summary>
public sealed record RegisterCoupleCommand(
    string TogetherID,
    string Username,
    string Name,
    DateTime DateOfBirth,
    string Email,
    string PhoneNumber,
    PartnerRole Role,
    string Password,
    string ConfirmPassword,
    string? IpAddress = null) : IRequest<AuthResult>;
