using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Saha.API.Tests.Infrastructure;
using Xunit;

namespace Saha.API.Tests.Controllers;

/// <summary>
/// FR-29 regression sweep. A couple with one partner must not fault <em>any</em> surface.
/// <para>
/// Before this change, <c>Couple.Husband</c>/<c>Wife</c> were <c>_partners.Single(...)</c>, and
/// thirteen call sites dereferenced them. The subtlest was
/// <c>GetConversationsQueryHandler.EnsurePartnerConversationAsync</c>, which fires on every
/// conversation-list load — a path no unit test walks. Every endpoint below is exercised against a
/// solo couple; the bar is simply "no unhandled 500".
/// </para>
/// </summary>
public sealed class AwaitingPartnerCoupleTests : IClassFixture<SahaWebApplicationFactory>
{
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AwaitingPartnerCoupleTests(SahaWebApplicationFactory factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    private async Task<RegisteredCouple> SoloCoupleAsync(string togetherId, string username) =>
        await AuthFlow.RegisterAsync(_client, togetherId, username, $"{username}@test.com");

    // ── FR-27a: the registrant may authenticate ───────────────────────────────

    [Fact]
    public async Task Login_ShouldSucceed_ForASoloCouple()
    {
        await SoloCoupleAsync("SOLO-LOGIN0001", "solologinuser");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "solologinuser", password = AuthFlow.DefaultPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RefreshToken_ShouldSucceed_ForASoloCouple()
    {
        await SoloCoupleAsync("SOLO-REFRESH001", "solorefreshuser");
        await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "solorefreshuser", password = AuthFlow.DefaultPassword });

        var response = await _client.PostAsync("/api/v1/auth/refresh", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── FR-27f: password reset addresses only the partner who exists ──────────

    [Fact]
    public async Task ForgotPassword_ShouldSucceed_ForASoloCouple()
    {
        await SoloCoupleAsync("SOLO-FORGOT001", "soloforgotuser");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new { togetherIDOrUsername = "SOLO-FORGOT001" });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── FR-27d: own profile reachable; partner profile is not ─────────────────

    [Fact]
    public async Task GetOwnProfile_ShouldSucceed_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-PROFILE001", "soloprofileuser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/profile/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleInfo").GetProperty("coupleState").GetString().Should().Be("AwaitingPartner");
        body.GetProperty("coupleInfo").GetProperty("partner").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task GetPartnerProfile_ShouldReturn404_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-NOPARTNER1", "solonopartner");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/profile/partner");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateOwnProfile_ShouldSucceed_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-UPDATE0001", "soloupdateuser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.PutAsJsonAsync("/api/v1/profile/me", new
        {
            name = "Renamed Registrant",
            dateOfBirth = "1990-01-01",
            email = "soloupdateuser@test.com",
            phoneNumber = "+11234567890"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── FR-27e: no partner conversation, and the list must not fault (site #8) ─

    [Fact]
    public async Task GetConversations_ShouldReturnEmpty_ForASoloCouple_AndNotFault()
    {
        // This is the regression that the source spec mistook for a safety net.
        // EnsurePartnerConversationAsync runs on every call to this endpoint.
        var solo = await SoloCoupleAsync("SOLO-CONVOS0001", "soloconvouser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/conversations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetArrayLength().Should().Be(0, "a couple awaiting its partner has nobody to talk to");
    }

    [Fact]
    public async Task GetConversations_ShouldProvisionThePartnerChat_OnceTheCoupleCompletes()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "SOLO-THENCOMPLETE", "solothencomplete", "solothen@test.com");

        AuthFlow.Authorize(_client, registered.AccessToken);
        var before = await _client.GetAsync("/api/v1/conversations");
        (await before.Content.ReadFromJsonAsync<JsonElement>(JsonOptions)).GetArrayLength().Should().Be(0);

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "solothenwife@test.com");
        await AuthFlow.AcceptInvitationAsync(_client, token, "solothenwife", "solothenwife@test.com");

        AuthFlow.Authorize(_client, registered.AccessToken);
        var after = await _client.GetAsync("/api/v1/conversations");

        after.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await after.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetArrayLength().Should().Be(1, "completing the couple provisions the pinned partner chat");
        body[0].GetProperty("type").GetString().Should().Be("Partner");
    }

    [Fact]
    public async Task CreateGroupConversation_ShouldReturn409_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-GROUP00001", "sologroupuser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.PostAsJsonAsync("/api/v1/conversations/group",
            new { name = "A bigger table", targetCoupleIds = new[] { Guid.NewGuid() } });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Conflict, HttpStatusCode.NotFound);
    }

    // ── FR-27b/c: invisible to other couples ──────────────────────────────────

    [Fact]
    public async Task SearchByTogetherId_ShouldNotFindASoloCouple()
    {
        await SoloCoupleAsync("SOLO-HIDDEN0001", "solohiddenuser");

        var searcher = await AuthFlow.CompleteCoupleAsync(_client, "SEARCHER-ID001",
            registrantUsername: "searcherhusb", registrantEmail: "searcherhusb@test.com",
            inviteeUsername: "searcherwife", inviteeEmail: "searcherwife@test.com");

        AuthFlow.Authorize(_client, searcher.AccessToken);
        var response = await _client.GetAsync("/api/v1/connect/search?togetherID=SOLO-HIDDEN0001");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetArrayLength().Should().Be(0, "a half-formed home is not part of the social graph");
    }

    [Fact]
    public async Task SearchByTogetherId_ShouldFindTheCouple_OnceComplete()
    {
        await AuthFlow.CompleteCoupleAsync(_client, "FINDABLE-ID001",
            registrantUsername: "findablehusb", registrantEmail: "findablehusb@test.com",
            inviteeUsername: "findablewife", inviteeEmail: "findablewife@test.com");

        var searcher = await AuthFlow.CompleteCoupleAsync(_client, "SEARCHER-ID002",
            registrantUsername: "searcher2husb", registrantEmail: "searcher2husb@test.com",
            inviteeUsername: "searcher2wife", inviteeEmail: "searcher2wife@test.com");

        AuthFlow.Authorize(_client, searcher.AccessToken);
        var response = await _client.GetAsync("/api/v1/connect/search?togetherID=FINDABLE-ID001");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetConnections_ShouldSucceed_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-CONNS00001", "soloconnsuser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/connect/connections");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SearchAsASoloCouple_ShouldSucceed_AndNotFault()
    {
        var solo = await SoloCoupleAsync("SOLO-SEARCHER01", "solosearcher");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/connect/search?togetherID=ANYTHING-AT-ALL");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Session ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Session_ShouldSucceed_ForASoloCouple()
    {
        var solo = await SoloCoupleAsync("SOLO-SESSION001", "solosessionuser");
        AuthFlow.Authorize(_client, solo.AccessToken);

        var response = await _client.GetAsync("/api/v1/auth/session");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
