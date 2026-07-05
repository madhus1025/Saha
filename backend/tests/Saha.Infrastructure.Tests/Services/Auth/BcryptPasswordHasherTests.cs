using FluentAssertions;
using Saha.Infrastructure.Services.Auth;
using Xunit;

namespace Saha.Infrastructure.Tests.Services.Auth;

public sealed class BcryptPasswordHasherTests
{
    private readonly BcryptPasswordHasher _hasher = new();

    [Fact]
    public void Hash_ShouldReturnNonEmptyHash()
    {
        var hash = _hasher.Hash("SecurePassword@123");

        hash.Should().NotBeNullOrWhiteSpace();
        hash.Should().StartWith("$2");
    }

    [Fact]
    public void Hash_ShouldProduceDifferentHashesForSamePassword()
    {
        const string password = "SecurePassword@123";

        var hash1 = _hasher.Hash(password);
        var hash2 = _hasher.Hash(password);

        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void Verify_ShouldReturnTrue_WhenPasswordMatchesHash()
    {
        const string password = "SecurePassword@123";
        var hash = _hasher.Hash(password);

        var result = _hasher.Verify(password, hash);

        result.Should().BeTrue();
    }

    [Fact]
    public void Verify_ShouldReturnFalse_WhenPasswordDoesNotMatchHash()
    {
        var hash = _hasher.Hash("CorrectPassword@123");

        var result = _hasher.Verify("WrongPassword@123", hash);

        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_ShouldReturnFalse_WhenHashIsInvalid()
    {
        var result = _hasher.Verify("SomePassword@123", "not-a-valid-bcrypt-hash");

        result.Should().BeFalse();
    }

    [Fact]
    public void Hash_ShouldWorkWithSpecialCharacters()
    {
        const string password = "P@ssw0rd!#$%^&*()_+";
        var hash = _hasher.Hash(password);

        _hasher.Verify(password, hash).Should().BeTrue();
    }

    [Fact]
    public void Hash_ShouldWorkWithUnicodeCharacters()
    {
        const string password = "Pässwörd123!प्रेम";
        var hash = _hasher.Hash(password);

        _hasher.Verify(password, hash).Should().BeTrue();
    }
}
