using MediatR;

namespace Saha.Application.Features.Auth.Commands.Register;

public sealed record RegisterCoupleCommand(
    string TogetherID,
    string HusbandUsername,
    string HusbandName,
    DateTime HusbandDateOfBirth,
    string HusbandEmail,
    string HusbandPhoneNumber,
    string WifeUsername,
    string WifeName,
    DateTime WifeDateOfBirth,
    string WifeEmail,
    string WifePhoneNumber,
    string Password,
    string ConfirmPassword) : IRequest<RegisterCoupleResult>;

public sealed record RegisterCoupleResult(Guid CoupleId, string TogetherID);
