using FluentAssertions;
using FluentValidation.TestHelper;
using Saha.Application.Features.Auth.Commands.Register;
using Xunit;

namespace Saha.Application.Tests.Features.Auth;

public sealed class RegisterCoupleCommandValidatorTests
{
    private readonly RegisterCoupleCommandValidator _validator = new();

    private static RegisterCoupleCommand ValidCommand() => new(
        TogetherID: "MADHU-PRIYA",
        HusbandUsername: "madhu",
        HusbandName: "Madhu Kumar",
        HusbandDateOfBirth: new DateTime(1990, 5, 15),
        HusbandEmail: "madhu@example.com",
        HusbandPhoneNumber: "+911234567890",
        WifeUsername: "priya",
        WifeName: "Priya Kumar",
        WifeDateOfBirth: new DateTime(1992, 8, 20),
        WifeEmail: "priya@example.com",
        WifePhoneNumber: "+919876543210",
        Password: "StrongP@ss1",
        ConfirmPassword: "StrongP@ss1");

    [Fact]
    public async Task ValidCommand_PassesValidation()
    {
        var result = await _validator.TestValidateAsync(ValidCommand());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("has-lowercase")]
    [InlineData("-STARTS-HYPHEN")]
    public async Task InvalidTogetherID_FailsValidation(string togetherId)
    {
        var command = ValidCommand() with { TogetherID = togetherId };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.TogetherID);
    }

    [Theory]
    [InlineData("weak")]
    [InlineData("alllowercase1!")]
    [InlineData("ALLUPPERCASE1!")]
    [InlineData("NoSpecialChar1")]
    [InlineData("NoNumber!A")]
    public async Task WeakPassword_FailsValidation(string password)
    {
        var command = ValidCommand() with { Password = password, ConfirmPassword = password };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public async Task MismatchedPasswords_FailsValidation()
    {
        var command = ValidCommand() with { ConfirmPassword = "DifferentP@ss1" };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.ConfirmPassword);
    }

    [Fact]
    public async Task SameUsernames_FailsValidation()
    {
        var command = ValidCommand() with { HusbandUsername = "same", WifeUsername = "same" };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.WifeUsername);
    }

    [Fact]
    public async Task SameEmails_FailsValidation()
    {
        var command = ValidCommand() with
        {
            HusbandEmail = "same@example.com",
            WifeEmail = "same@example.com"
        };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.WifeEmail);
    }

    [Theory]
    [InlineData("invalid-email")]
    [InlineData("@nodomain")]
    [InlineData("noDomain@")]
    public async Task InvalidEmail_FailsValidation(string email)
    {
        var command = ValidCommand() with { HusbandEmail = email };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.HusbandEmail);
    }

    [Fact]
    public async Task HusbandUnder16_FailsValidation()
    {
        var command = ValidCommand() with
        {
            HusbandDateOfBirth = DateTime.UtcNow.AddYears(-10)
        };
        var result = await _validator.TestValidateAsync(command);
        result.ShouldHaveValidationErrorFor(x => x.HusbandDateOfBirth);
    }
}
