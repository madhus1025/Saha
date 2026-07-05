using FluentAssertions;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;
using Xunit;

namespace Saha.Domain.Tests.ValueObjects;

public sealed class TogetherIDTests
{
    [Theory]
    [InlineData("MADHU-PRIYA")]
    [InlineData("JOHN-JANE")]
    [InlineData("A1B-C2D")]
    [InlineData("COUPLE123")]
    [InlineData("A-B-C-D-E")]
    public void Create_WithValidInput_ReturnsTogetherID(string input)
    {
        var result = TogetherID.Create(input);
        result.Should().NotBeNull();
        result.Value.Should().Be(input.ToUpperInvariant());
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData(null!)]
    public void Create_WithEmptyInput_ThrowsDomainValidationException(string? input)
    {
        var act = () => TogetherID.Create(input!);
        act.Should().Throw<DomainValidationException>();
    }

    [Theory]
    [InlineData("A")]
    [InlineData("AB")]
    [InlineData("-STARTS-WITH-HYPHEN")]
    [InlineData("ENDS-WITH-HYPHEN-")]
    [InlineData("has spaces")]
    [InlineData("has_underscore")]
    public void Create_WithInvalidFormat_ThrowsDomainValidationException(string input)
    {
        var act = () => TogetherID.Create(input);
        act.Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Create_NormalizesInputToUppercase()
    {
        var result = TogetherID.Create("madhu-priya");
        result.Value.Should().Be("MADHU-PRIYA");
    }

    [Fact]
    public void Create_ExceedsMaxLength_ThrowsDomainValidationException()
    {
        var tooLong = new string('A', 51);
        var act = () => TogetherID.Create(tooLong);
        act.Should().Throw<DomainValidationException>().WithMessage("*50*");
    }

    [Fact]
    public void Equality_WithSameValue_ReturnsTrue()
    {
        var id1 = TogetherID.Create("MADHU-PRIYA");
        var id2 = TogetherID.Create("MADHU-PRIYA");
        id1.Should().Be(id2);
    }

    [Fact]
    public void ImplicitConversion_ToStringReturnsValue()
    {
        var id = TogetherID.Create("MADHU-PRIYA");
        string value = id;
        value.Should().Be("MADHU-PRIYA");
    }
}
