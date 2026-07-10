using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Saha.API.Tests.Infrastructure;
using Xunit;

namespace Saha.API.Tests.Controllers;

public sealed class AuthControllerTests : IClassFixture<SahaWebApplicationFactory>
{
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AuthControllerTests(SahaWebApplicationFactory factory)
    {
        // Each test gets its own host (via WithWebHostBuilder) built from the shared factory,
        // so the "auth" rate limiter's in-memory counters don't carry over between tests while
        // still reusing the same in-memory database configured on the shared factory instance.
        //
        // The refresh-token cookie is marked Secure; CookieContainer only attaches Secure
        // cookies to https requests, so the test client must talk to the TestServer over https.
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    // ── Registration (AC1, AC6, AC15) ─────────────────────────────────────────

    [Fact]
    public async Task Register_ShouldReturn201WithTokensAndCookie_WhenValidRequest()
    {
        var request = AuthFlow.RegisterRequest("TEST-REGISTER01", "registerhusbnd", "registerhusband@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("togetherID").GetString().Should().Be("TEST-REGISTER01");
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("role").GetString().Should().Be("Husband");

        // "Open our home" opens it: the registrant is signed in, not bounced to a login screen.
        var setCookieHeader = response.Headers.FirstOrDefault(h => h.Key == "Set-Cookie");
        setCookieHeader.Value.Should().Contain(v => v.Contains("X-Refresh-Token"));
    }

    [Fact]
    public async Task Register_ShouldLeaveCoupleAwaitingPartner()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("TEST-AWAITING01", "awaitinghusb", "awaiting@test.com"));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleState").GetString().Should().Be("AwaitingPartner");
    }

    [Fact]
    public async Task Register_ShouldReturn400_WhenGivenTheOldTwoPartnerPayload()
    {
        // The thirteen-field contract is gone (AC15).
        var legacyRequest = new
        {
            togetherID = "LEGACY-ID01",
            password = "SecurePass@123!",
            confirmPassword = "SecurePass@123!",
            husbandUsername = "legacyhusbnd",
            husbandName = "Test Husband",
            husbandDateOfBirth = "1990-01-01",
            husbandEmail = "legacyhusband@test.com",
            husbandPhoneNumber = "+11234567890",
            wifeUsername = "legacywife",
            wifeName = "Test Wife",
            wifeDateOfBirth = "1992-06-15",
            wifeEmail = "legacywife@test.com",
            wifePhoneNumber = "+19876543210"
        };

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", legacyRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_ShouldAcceptAPassphrase_WithNoDigitsOrSymbols()
    {
        var request = AuthFlow.RegisterRequest("TEST-PASSPHRASE1", "passphraseuser", "passphrase@test.com",
            password: "correct horse battery staple");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Register_ShouldReturn400_WhenPasswordExceedsSeventyTwoBytes()
    {
        var request = AuthFlow.RegisterRequest("TEST-LONGPASS01", "longpassuser", "longpass@test.com",
            password: new string('a', 73));

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_ShouldReturn409_WhenTogetherIDAlreadyExists()
    {
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("DUPLICATE-ID01", "duphusbnd", "duphusband@test.com"));

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("DUPLICATE-ID01", "otherhusband", "other.husband@test.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_ShouldReturn409_WhenUsernameAlreadyExists()
    {
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("DUPUSER-ID01", "takenusername", "takenuser@test.com"));

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("DUPUSER-ID02", "takenusername", "different@test.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_ShouldReturn400_WhenRequestIsInvalid()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { togetherId = "", password = "short" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Availability (AC8) ────────────────────────────────────────────────────

    [Fact]
    public async Task Availability_ShouldReportTogetherIdTaken_AfterRegistration()
    {
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            AuthFlow.RegisterRequest("AVAIL-TAKEN01", "availuser", "avail@test.com"));

        var response = await _client.GetAsync("/api/v1/auth/availability?togetherId=AVAIL-TAKEN01");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("togetherIDAvailable").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Availability_ShouldReportFreeNames_AsAvailable()
    {
        var response = await _client.GetAsync(
            "/api/v1/auth/availability?togetherId=NOBODY-HAS-THIS&username=nobodyhasthis");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("togetherIDAvailable").GetBoolean().Should().BeTrue();
        body.GetProperty("usernameAvailable").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Availability_ShouldOnlyReportTheFieldsAsked_LeavingOthersNull()
    {
        var response = await _client.GetAsync("/api/v1/auth/availability?username=onlyusername");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("usernameAvailable").GetBoolean().Should().BeTrue();
        body.GetProperty("togetherIDAvailable").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Availability_ShouldReturn400_WhenNeitherFieldSupplied()
    {
        var response = await _client.GetAsync("/api/v1/auth/availability");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Invitation & completion (AC2, AC3, AC9, AC14) ─────────────────────────

    [Fact]
    public async Task AcceptInvitation_ShouldCompleteTheCouple_AndAssignComplementaryRole()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "INVITE-FLOW01", "inviteflowhusb", "inviteflow@test.com", role: "Husband");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "inviteflowwife@test.com");

        var response = await AuthFlow.AcceptInvitationAsync(
            _client, token, "inviteflowwife", "inviteflowwife@test.com");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleState").GetString().Should().Be("Complete");
        body.GetProperty("role").GetString().Should().Be("Wife");
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task AcceptInvitation_ShouldAssignHusband_WhenRegistrantIsWife()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "INVITE-WIFE01", "invitewifereg", "invitewifereg@test.com", role: "Wife");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Husband", "invitehusb@test.com");

        var response = await AuthFlow.AcceptInvitationAsync(
            _client, token, "invitehusbnd", "invitehusb@test.com");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("role").GetString().Should().Be("Husband");
    }

    [Fact]
    public async Task AcceptInvitation_ShouldReturn404_WhenTokenIsUnknown()
    {
        var response = await AuthFlow.AcceptInvitationAsync(
            _client, "not-a-real-token", "ghostuser", "ghost@test.com");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AcceptInvitation_ShouldReturn409_WhenUsedTwice()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "INVITE-TWICE01", "invitetwicehsb", "invitetwice@test.com");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "invitetwicewife@test.com");

        await AuthFlow.AcceptInvitationAsync(_client, token, "invitetwicewife", "invitetwicewife@test.com");
        var second = await AuthFlow.AcceptInvitationAsync(_client, token, "invitetwiceother", "other@test.com");

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task AcceptInvitation_ShouldReturn409_WhenUsernameMatchesRegistrant()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "INVITE-SAMEUSER1", "samenameuser", "samename@test.com");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "samenamewife@test.com");

        var response = await AuthFlow.AcceptInvitationAsync(
            _client, token, "samenameuser", "samenamewife@test.com");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreateInvitation_ShouldReturn409_WhenCoupleAlreadyComplete()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "INVITE-DONE001", "invitedonehusb", "invitedone@test.com");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "invitedonewife@test.com");
        await AuthFlow.AcceptInvitationAsync(_client, token, "invitedonewife", "invitedonewife@test.com");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/invitations")
        {
            Content = JsonContent.Create(new { inviteeName = "Third", inviteeEmail = "third@test.com" })
        };
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", registered.AccessToken);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreateInvitation_ShouldReturn401_WhenNotAuthenticated()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/invitations",
            new { inviteeName = "Nobody", inviteeEmail = "nobody@test.com" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Session (AC14) ────────────────────────────────────────────────────────

    [Fact]
    public async Task Session_ShouldReportAwaitingPartner_ForASoloRegistrant()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "SESSION-SOLO01", "sessionsolo", "sessionsolo@test.com");

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/session");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", registered.AccessToken);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleState").GetString().Should().Be("AwaitingPartner");
        body.GetProperty("username").GetString().Should().Be("sessionsolo");
    }

    [Fact]
    public async Task Session_ShouldReportComplete_OnceThePartnerAccepts()
    {
        var registered = await AuthFlow.RegisterAsync(
            _client, "SESSION-DONE01", "sessiondonehsb", "sessiondone@test.com");

        var token = await AuthFlow.CreateInvitationAsync(
            _client, registered.AccessToken, "Test Wife", "sessiondonewife@test.com");
        await AuthFlow.AcceptInvitationAsync(_client, token, "sessiondonewife", "sessiondonewife@test.com");

        // The registrant's access token predates completion; state must be read fresh (DL-4).
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/session");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", registered.AccessToken);

        var response = await _client.SendAsync(request);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleState").GetString().Should().Be("Complete");
    }

    [Fact]
    public async Task Session_ShouldReturn401_WhenNotAuthenticated()
    {
        var response = await _client.GetAsync("/api/v1/auth/session");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Login (AC6, FR-3, FR-7) ───────────────────────────────────────────────

    [Fact]
    public async Task Login_ShouldReturn200AndSetRefreshCookie_WhenValidCredentials()
    {
        await AuthFlow.RegisterAsync(_client, "LOGIN-TEST01", "loginhusbnd", "loginhusband@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "loginhusbnd", password = AuthFlow.DefaultPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();

        var setCookieHeader = response.Headers.FirstOrDefault(h => h.Key == "Set-Cookie");
        setCookieHeader.Value.Should().Contain(v => v.Contains("X-Refresh-Token"));
        setCookieHeader.Value.Should().Contain(v => v.Contains("httponly", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Login_ShouldSucceedForTheSoloRegistrant_AndReportAwaitingPartner()
    {
        await AuthFlow.RegisterAsync(_client, "LOGIN-SOLO01", "loginsolo", "loginsolo@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "loginsolo", password = AuthFlow.DefaultPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("coupleState").GetString().Should().Be("AwaitingPartner");
    }

    [Fact]
    public async Task Login_ShouldReturn401_WhenInvalidCredentials()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "nonexistentuser", password = "WrongPassword@1" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_ShouldReturnIdenticalBody_ForUnknownUserAndWrongPassword()
    {
        await AuthFlow.RegisterAsync(_client, "UNIFORM-FAIL01", "uniformuser", "uniform@test.com");

        var unknownUser = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "thisuserdoesnot", password = AuthFlow.DefaultPassword });
        var wrongPassword = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "uniformuser", password = "definitely the wrong one" });

        unknownUser.StatusCode.Should().Be(wrongPassword.StatusCode);
        (await unknownUser.Content.ReadAsStringAsync())
            .Should().Be(await wrongPassword.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Login_ShouldIdentifyCorrectPartner_WhenHusbandLogsIn()
    {
        await AuthFlow.CompleteCoupleAsync(_client, "PARTNER-ID01",
            registrantUsername: "partnerhusbnd", registrantEmail: "partnerhusband1@test.com",
            inviteeUsername: "partnerwife1", inviteeEmail: "partnerwife1@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "partnerhusbnd", password = AuthFlow.DefaultPassword });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        body.GetProperty("username").GetString().Should().Be("partnerhusbnd");
        body.GetProperty("role").GetString().Should().Be("Husband");
        body.GetProperty("coupleState").GetString().Should().Be("Complete");
    }

    [Fact]
    public async Task Login_ShouldIdentifyCorrectPartner_WhenWifeLogsIn()
    {
        await AuthFlow.CompleteCoupleAsync(_client, "PARTNER-ID02",
            registrantUsername: "partnerhusbnd2", registrantEmail: "husband2@test.com",
            inviteeUsername: "partnerwife2", inviteeEmail: "wife2@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "partnerwife2", password = AuthFlow.DefaultPassword });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        body.GetProperty("username").GetString().Should().Be("partnerwife2");
        body.GetProperty("role").GetString().Should().Be("Wife");
    }

    // ── Refresh, logout, reset ────────────────────────────────────────────────

    [Fact]
    public async Task RefreshToken_ShouldReturn200_WhenValidCookiePresent()
    {
        await AuthFlow.RegisterAsync(_client, "REFRESH-TEST01", "refreshhusbnd", "refreshhusband@test.com");
        await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "refreshhusbnd", password = AuthFlow.DefaultPassword });

        var response = await _client.PostAsync("/api/v1/auth/refresh", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Logout_ShouldReturn204_WhenAuthenticated()
    {
        await AuthFlow.RegisterAsync(_client, "LOGOUT-TEST01", "logouthusbnd", "logouthusband@test.com");
        var accessToken = await AuthFlow.LoginAsync(_client, "logouthusbnd");

        AuthFlow.Authorize(_client, accessToken);
        var response = await _client.PostAsync("/api/v1/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ForgotPassword_ShouldReturn204_WhenTogetherIDExists()
    {
        await AuthFlow.RegisterAsync(_client, "FORGOT-TEST01", "forgothusbnd", "forghusband@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new { togetherIDOrUsername = "FORGOT-TEST01" });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ForgotPassword_ShouldReturn204_EvenWhenTogetherIDDoesNotExist()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new { togetherIDOrUsername = "NONEXISTENT-ID" });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ProtectedEndpoint_ShouldReturn401_WhenNotAuthenticated()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.GetAsync("/api/v1/profile/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RateLimit_ShouldReturn429_WhenExceeded()
    {
        var tasks = Enumerable.Range(0, 10).Select(_ =>
            _client.PostAsJsonAsync("/api/v1/auth/login",
                new { username = "ratelimituser", password = "WrongPass@1" }));

        var responses = await Task.WhenAll(tasks);

        responses.Should().Contain(r => r.StatusCode == HttpStatusCode.TooManyRequests);
    }
}
