using FluentAssertions;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;
using Xunit;

namespace Saha.Domain.Tests.ValueObjects;

public sealed class ConversationNameTests
{
    [Fact]
    public void Create_WithValidName_TrimsAndStores()
    {
        var name = ConversationName.Create("  Family Chat  ");

        name.Value.Should().Be("Family Chat");
        ((string)name).Should().Be("Family Chat");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithEmptyName_Throws(string value)
    {
        var act = () => ConversationName.Create(value);

        act.Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Create_WithNameOver80Chars_Throws()
    {
        var act = () => ConversationName.Create(new string('a', 81));

        act.Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Create_WithNameExactly80Chars_Succeeds()
    {
        var name = ConversationName.Create(new string('a', 80));

        name.Value.Should().HaveLength(80);
    }
}
