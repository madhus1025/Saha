using FluentAssertions;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;
using Xunit;

namespace Saha.Domain.Tests.ValueObjects;

public sealed class UsernameTests
{
    [Theory]
    [InlineData("madhu")]
    [InlineData("priya123")]
    [InlineData("john_doe")]
    [InlineData("jane.doe")]
    [InlineData("abc")]
    public void Create_WithValidInput_ReturnsUsername(string input)
    {
        var result = Username.Create(input);
        result.Should().NotBeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("1startswithnumber")]
    [InlineData("HAS-UPPERCASE")]
    [InlineData("has space")]
    public void Create_WithInvalidInput_ThrowsDomainValidationException(string input)
    {
        var act = () => Username.Create(input);
        act.Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Create_NormalizesToLowercase()
    {
        var result = Username.Create("Madhu");
        result.Value.Should().Be("madhu");
    }

    [Fact]
    public void Create_TooShort_ThrowsDomainValidationException()
    {
        var act = () => Username.Create("ab");
        act.Should().Throw<DomainValidationException>().WithMessage("*3*");
    }

    [Fact]
    public void Create_TooLong_ThrowsDomainValidationException()
    {
        var act = () => Username.Create(new string('a', 31));
        act.Should().Throw<DomainValidationException>().WithMessage("*30*");
    }
}
