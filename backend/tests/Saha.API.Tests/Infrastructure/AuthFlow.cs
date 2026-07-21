using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Saha.API.Tests.Infrastructure;

/// <summary>
/// Drives the registration lifecycle over HTTP. Registration alone leaves a couple
/// <c>AwaitingPartner</c>; <see cref="CompleteCoupleAsync"/> walks it through invite + accept so
/// tests that only care about a working couple do not have to spell out the ceremony.
/// </summary>
public static class AuthFlow
{
    public const string DefaultPassword = "Our quiet home by the sea 1!";

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static object RegisterRequest(
        string togetherId,
        string username,
        string email,
        string role = "Husband",
        string password = DefaultPassword) => new
        {
            togetherID = togetherId,
            username,
            name = "Test Registrant",
            dateOfBirth = "1990-01-01",
            email,
            phoneNumber = "+11234567890",
            role,
            password,
            confirmPassword = password
        };

    /// <summary>Registers a couple. It is left in state <c>AwaitingPartner</c>.</summary>
    public static async Task<RegisteredCouple> RegisterAsync(
        HttpClient client,
        string togetherId,
        string username,
        string email,
        string role = "Husband",
        string password = DefaultPassword)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register", RegisterRequest(togetherId, username, email, role, password));

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        return new RegisteredCouple(
            TogetherId: togetherId,
            Username: username,
            Password: password,
            AccessToken: body.GetProperty("accessToken").GetString()!,
            CoupleState: body.GetProperty("coupleState").GetString()!);
    }

    /// <summary>Registers, invites, and accepts — leaving the couple <c>Complete</c>.</summary>
    public static async Task<RegisteredCouple> CompleteCoupleAsync(
        HttpClient client,
        string togetherId,
        string registrantUsername,
        string registrantEmail,
        string inviteeUsername,
        string inviteeEmail,
        string registrantRole = "Husband",
        string password = DefaultPassword)
    {
        var registered = await RegisterAsync(
            client, togetherId, registrantUsername, registrantEmail, registrantRole, password);

        var token = await CreateInvitationAsync(client, registered.AccessToken, "Test Invitee", inviteeEmail);
        await AcceptInvitationAsync(client, token, inviteeUsername, inviteeEmail);

        return registered with { CoupleState = "Complete" };
    }

    public static async Task<string> CreateInvitationAsync(
        HttpClient client, string accessToken, string inviteeName, string inviteeEmail)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/invitations")
        {
            Content = JsonContent.Create(new { inviteeName, inviteeEmail })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return body.GetProperty("token").GetString()!;
    }

    public static async Task<HttpResponseMessage> AcceptInvitationAsync(
        HttpClient client, string token, string username, string email) =>
        await client.PostAsJsonAsync("/api/v1/auth/invitations/accept", new
        {
            token,
            username,
            name = "Test Invitee",
            dateOfBirth = "1992-06-15",
            email,
            phoneNumber = "+19876543210"
        });

    public static async Task<string> LoginAsync(HttpClient client, string username, string password = DefaultPassword)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return body.GetProperty("accessToken").GetString()!;
    }

    public static void Authorize(HttpClient client, string accessToken) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
}

public sealed record RegisteredCouple(
    string TogetherId,
    string Username,
    string Password,
    string AccessToken,
    string CoupleState);
