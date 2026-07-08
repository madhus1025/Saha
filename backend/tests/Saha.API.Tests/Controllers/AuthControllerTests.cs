using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Saha.API.Tests.Infrastructure;
using Xunit;

namespace Saha.API.Tests.Controllers;

public sealed class AuthControllerTests : IDisposable
{
    private readonly HttpClient _client;
    private readonly SahaWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Each test gets an isolated in-memory database (and a fresh rate-limiter window) so shared
    // registrations/usernames can't collide across tests.
    public AuthControllerTests()
    {
        _factory = new SahaWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task Register_ShouldReturn201_WhenValidRequest()
    {
        var request = BuildRegisterRequest("TEST-REGISTER01");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("togetherID").GetString().Should().Be("TEST-REGISTER01");
    }

    [Fact]
    public async Task Register_ShouldReturn409_WhenTogetherIDAlreadyExists()
    {
        var request = BuildRegisterRequest("DUPLICATE-ID01");
        await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        var duplicateRequest = BuildRegisterRequest("DUPLICATE-ID01", husbandUser: "otherhusband", wifeUser: "otherwife",
            husbandEmail: "other.husband@test.com", wifeEmail: "other.wife@test.com");
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", duplicateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_ShouldReturn400_WhenRequestIsInvalid()
    {
        var request = new { togetherId = "", password = "short" };

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_ShouldReturn200AndSetRefreshCookie_WhenValidCredentials()
    {
        var togetherId = "LOGIN-TEST01";
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest(togetherId));

        var loginRequest = new { username = "loginhusbnd", password = "SecurePass@123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();

        // Set-Cookie is a collection of raw cookie strings — assert on the combined value.
        var setCookie = string.Join("; ", response.Headers.GetValues("Set-Cookie"));
        setCookie.Should().Contain("X-Refresh-Token");
        setCookie.ToLowerInvariant().Should().Contain("httponly");
    }

    [Fact]
    public async Task Login_ShouldReturn401_WhenInvalidCredentials()
    {
        var loginRequest = new { username = "nonexistentuser", password = "WrongPassword@1" };

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_ShouldIdentifyCorrectPartner_WhenHusbandLogsIn()
    {
        var togetherId = "PARTNER-ID01";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            BuildRegisterRequest(togetherId, husbandUser: "partnerhusbnd"));

        var loginRequest = new { username = "partnerhusbnd", password = "SecurePass@123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        body.GetProperty("username").GetString().Should().Be("partnerhusbnd");
        body.GetProperty("role").GetString().Should().Be("Husband");
    }

    [Fact]
    public async Task Login_ShouldIdentifyCorrectPartner_WhenWifeLogsIn()
    {
        var togetherId = "PARTNER-ID02";
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest(togetherId,
            husbandUser: "partnerhusbnd2", wifeUser: "partnerwife2",
            husbandEmail: "husband2@test.com", wifeEmail: "wife2@test.com"));

        var loginRequest = new { username = "partnerwife2", password = "SecurePass@123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        body.GetProperty("username").GetString().Should().Be("partnerwife2");
        body.GetProperty("role").GetString().Should().Be("Wife");
    }

    [Fact]
    public async Task RefreshToken_ShouldReturn200_WhenValidCookiePresent()
    {
        var togetherId = "REFRESH-TEST01";
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest(togetherId,
            husbandUser: "refreshhusbnd", wifeUser: "refreshwife",
            husbandEmail: "refreshhusband@test.com", wifeEmail: "refreshwife@test.com"));

        var loginRequest = new { username = "refreshhusbnd", password = "SecurePass@123!" };
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // The refresh cookie is marked Secure, so the http test client won't auto-resend it —
        // forward it explicitly on the refresh call.
        var refreshCookie = loginResponse.Headers
            .GetValues("Set-Cookie")
            .First(c => c.StartsWith("X-Refresh-Token"))
            .Split(';')[0];
        var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshRequest.Headers.Add("Cookie", refreshCookie);
        var response = await _client.SendAsync(refreshRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Logout_ShouldReturn204_WhenAuthenticated()
    {
        var togetherId = "LOGOUT-TEST01";
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest(togetherId,
            husbandUser: "logouthusbnd", wifeUser: "logoutwife",
            husbandEmail: "logouthusband@test.com", wifeEmail: "logoutwife@test.com"));

        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { username = "logouthusbnd", password = "SecurePass@123!" });
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var accessToken = loginBody.GetProperty("accessToken").GetString();

        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _client.PostAsync("/api/v1/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ForgotPassword_ShouldReturn200_WhenTogetherIDExists()
    {
        var togetherId = "FORGOT-TEST01";
        await _client.PostAsJsonAsync("/api/v1/auth/register", BuildRegisterRequest(togetherId,
            husbandUser: "forgothusbnd", wifeUser: "forgotwife",
            husbandEmail: "forghusband@test.com", wifeEmail: "forgwife@test.com"));

        var request = new { togetherIDOrUsername = "FORGOT-TEST01" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/forgot-password", request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ForgotPassword_ShouldReturn200_EvenWhenTogetherIDDoesNotExist()
    {
        var request = new { togetherIDOrUsername = "NONEXISTENT-ID" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/forgot-password", request);

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

    private static object BuildRegisterRequest(
        string togetherId,
        string husbandUser = "loginhusbnd",
        string wifeUser = "loginwife",
        string husbandEmail = "husband@test.com",
        string wifeEmail = "wife@test.com") =>
        new
        {
            togetherID = togetherId,
            husbandUsername = husbandUser,
            husbandName = "Test Husband",
            husbandDateOfBirth = "1990-01-01",
            husbandEmail,
            husbandPhoneNumber = "+11234567890",
            wifeUsername = wifeUser,
            wifeName = "Test Wife",
            wifeDateOfBirth = "1992-06-15",
            wifeEmail,
            wifePhoneNumber = "+19876543210",
            password = "SecurePass@123!",
            confirmPassword = "SecurePass@123!"
        };
}
