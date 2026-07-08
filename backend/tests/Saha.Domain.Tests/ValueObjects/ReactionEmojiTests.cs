using FluentAssertions;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;
using Xunit;

namespace Saha.Domain.Tests.ValueObjects;

public sealed class ReactionEmojiTests
{
    [Theory]
    [InlineData("heart")]
    [InlineData("laugh")]
    [InlineData("wow")]
    [InlineData("sad")]
    [InlineData("thumbsup")]
    [InlineData("fire")]
    public void Create_WithCuratedToken_Succeeds(string token)
    {
        var emoji = ReactionEmoji.Create(token);

        emoji.Value.Should().Be(token);
        ((string)emoji).Should().Be(token);
    }

    [Fact]
    public void Create_NormalizesCaseAndWhitespace()
    {
        var emoji = ReactionEmoji.Create("  HEART ");

        emoji.Value.Should().Be("heart");
    }

    [Theory]
    [InlineData("poop")]
    [InlineData("❤️")]
    [InlineData("")]
    [InlineData("clap")]
    public void Create_WithOffListToken_Throws(string token)
    {
        var act = () => ReactionEmoji.Create(token);

        act.Should().Throw<DomainValidationException>();
    }
}
