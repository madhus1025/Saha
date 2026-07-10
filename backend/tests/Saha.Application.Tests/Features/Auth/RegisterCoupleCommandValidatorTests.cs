using FluentAssertions;
using Saha.Application.Features.Auth.Commands.Register;
using Saha.Domain.Enums;
using Xunit;

namespace Saha.Application.Tests.Features.Auth;

public sealed class RegisterCoupleCommandValidatorTests
{
    private readonly RegisterCoupleCommandValidator _validator = new();

    private static RegisterCoupleCommand ValidCommand() => new(
        TogetherID: "MADHU-PRIYA",
        Username: "madhu",
        Name: "Madhu Kumar",
        DateOfBirth: new DateTime(1990, 5, 15),
        Email: "madhu@example.com",
        PhoneNumber: "+911234567890",
        Role: PartnerRole.Husband,
        Password: "our quiet home by the sea",
        ConfirmPassword: "our quiet home by the sea");

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        _validator.Validate(ValidCommand()).IsValid.Should().BeTrue();
    }

    // ── The command describes one partner only (AC15) ─────────────────────────

    [Fact]
    public void Command_ExposesNoFieldsAboutTheOtherPartner()
    {
        var propertyNames = typeof(RegisterCoupleCommand)
            .GetProperties()
            .Select(p => p.Name)
            .ToList();

        propertyNames.Should().NotContain(n => n.StartsWith("Husband") || n.StartsWith("Wife"));
    }

    // ── TogetherID ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("A-B")]                 // 3 chars — the domain requires 4
    [InlineData("madhu-priya")]         // lowercase
    [InlineData("MADHU_PRIYA")]         // underscore not allowed
    [InlineData("-MADHU")]              // must start alphanumeric
    public void Validate_WithInvalidTogetherId_Fails(string togetherId)
    {
        var result = _validator.Validate(ValidCommand() with { TogetherID = togetherId });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.TogetherID));
    }

    [Fact]
    public void Validate_WithFourCharacterTogetherId_Passes()
    {
        _validator.Validate(ValidCommand() with { TogetherID = "AB-C" }).IsValid.Should().BeTrue();
    }

    // ── Username ──────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("ab")]                  // too short
    [InlineData("MADHU")]               // uppercase
    [InlineData("1madhu")]              // must start with a letter
    public void Validate_WithInvalidUsername_Fails(string username)
    {
        var result = _validator.Validate(ValidCommand() with { Username = username });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.Username));
    }

    // ── Password: length only, no character classes (AC7) ─────────────────────

    [Fact]
    public void Validate_WithPassphrase_HavingNoDigitSymbolOrCapital_Passes()
    {
        const string passphrase = "correct horse battery staple";

        var result = _validator.Validate(ValidCommand() with
        {
            Password = passphrase,
            ConfirmPassword = passphrase
        });

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithElevenCharacterPassword_FailsForLengthAlone()
    {
        // Eleven characters, containing all four classes the old policy demanded.
        var result = _validator.Validate(ValidCommand() with
        {
            Password = "Sh0rt!Sh0rt",
            ConfirmPassword = "Sh0rt!Sh0rt"
        });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.Password));
    }

    [Fact]
    public void Validate_WithExactlyTwelveCharacters_Passes()
    {
        var twelve = new string('a', 12);

        _validator.Validate(ValidCommand() with { Password = twelve, ConfirmPassword = twelve })
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithExactlySeventyTwoBytes_Passes()
    {
        var seventyTwo = new string('a', 72);

        _validator.Validate(ValidCommand() with { Password = seventyTwo, ConfirmPassword = seventyTwo })
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithSeventyThreeBytes_Fails()
    {
        // BCrypt would silently ignore everything past byte 72.
        var seventyThree = new string('a', 73);

        var result = _validator.Validate(ValidCommand() with
        {
            Password = seventyThree,
            ConfirmPassword = seventyThree
        });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.Password));
    }

    [Fact]
    public void Validate_CountsBytesNotCharacters_ForMultiByteCharacters()
    {
        // 30 emoji × 4 bytes = 120 bytes, but only 30 "characters".
        var emoji = string.Concat(Enumerable.Repeat("😀", 30));

        var result = _validator.Validate(ValidCommand() with { Password = emoji, ConfirmPassword = emoji });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.Password));
    }

    [Fact]
    public void Validate_WithMismatchedConfirmation_Fails()
    {
        var result = _validator.Validate(ValidCommand() with { ConfirmPassword = "something else here" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.ConfirmPassword));
    }

    // ── Date of birth ─────────────────────────────────────────────────────────

    [Fact]
    public void Validate_WithAgeUnderSixteen_Fails()
    {
        var almostSixteen = DateTime.UtcNow.Date.AddYears(-16).AddDays(1);

        var result = _validator.Validate(ValidCommand() with { DateOfBirth = almostSixteen });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.DateOfBirth));
    }

    [Fact]
    public void Validate_WithExactlySixteen_Passes()
    {
        var exactlySixteen = DateTime.UtcNow.Date.AddYears(-16);

        _validator.Validate(ValidCommand() with { DateOfBirth = exactlySixteen })
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithImplausibleAge_Fails()
    {
        var result = _validator.Validate(ValidCommand() with
        {
            DateOfBirth = DateTime.UtcNow.Date.AddYears(-121)
        });

        result.IsValid.Should().BeFalse();
    }

    // ── Contact details & role ────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void Validate_WithInvalidEmail_Fails(string email)
    {
        _validator.Validate(ValidCommand() with { Email = email }).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("12345")]
    [InlineData("+0123456789")]
    public void Validate_WithInvalidPhoneNumber_Fails(string phone)
    {
        _validator.Validate(ValidCommand() with { PhoneNumber = phone }).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithUnknownRole_Fails()
    {
        var result = _validator.Validate(ValidCommand() with { Role = (PartnerRole)99 });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCoupleCommand.Role));
    }

    [Theory]
    [InlineData(PartnerRole.Husband)]
    [InlineData(PartnerRole.Wife)]
    public void Validate_WithEitherRole_Passes(PartnerRole role)
    {
        _validator.Validate(ValidCommand() with { Role = role }).IsValid.Should().BeTrue();
    }
}
