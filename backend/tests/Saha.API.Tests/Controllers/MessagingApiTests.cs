using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Saha.API.Tests.Infrastructure;
using Saha.Application.Common.Interfaces;
using Xunit;

namespace Saha.API.Tests.Controllers;

/// <summary>
/// End-to-end messaging API tests. Each instance gets an isolated in-memory database and drives the
/// real HTTP pipeline (register → login → bearer). Maps to TDD §16 (FR-1, 2, 4, 6, 7, 8, 10, 12–24, 25).
/// </summary>
public sealed class MessagingApiTests : IDisposable
{
    private readonly MessagingWebApplicationFactory _factory = new();

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public MessagingApiTests()
    {
        // Media uploads go through a stubbed blob store that returns a deterministic URL.
        var storage = _factory.Services.GetRequiredService<IBlobStorageService>();
        storage.UploadAsync(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(),
                Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult("https://blob.test/messages/photo.jpg"));
    }

    // ---- FR-1 / FR-2 / FR-10: partner conversation ---------------------------------------------

    [Fact]
    public async Task GetConversations_ShouldReturnAutoProvisionedPartnerConversationPinnedFirst()
    {
        var couple = await RegisterAndLoginAsync();

        var conversations = await GetConversationsAsync(couple.Client);

        conversations.Should().NotBeEmpty();
        var first = conversations[0];
        first.GetProperty("type").GetString().Should().Be("Partner");
        first.GetProperty("isPinned").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetConversations_ShouldReturn401_WhenNotAuthenticated()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/conversations");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ---- FR-13 / FR-20: send + list text, pagination -------------------------------------------

    [Fact]
    public async Task SendText_ThenGetMessages_ShouldReturnSentMessage()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);

        var send = await couple.Client.PostAsJsonAsync(MessagesRoute(conversationId), new { body = "Hello love" });
        send.StatusCode.Should().Be(HttpStatusCode.Created);

        var page = await GetJsonAsync(couple.Client, MessagesRoute(conversationId));
        var items = page.GetProperty("items").EnumerateArray().ToList();
        items.Should().ContainSingle();
        items[0].GetProperty("body").GetString().Should().Be("Hello love");
        items[0].GetProperty("senderPartnerId").GetGuid().Should().Be(couple.PartnerId);
    }

    [Fact]
    public async Task GetMessages_ShouldPaginateNewestFirstWithCursor()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);

        foreach (var text in new[] { "one", "two", "three" })
            (await couple.Client.PostAsJsonAsync(MessagesRoute(conversationId), new { body = text }))
                .EnsureSuccessStatusCode();

        var firstPage = await GetJsonAsync(couple.Client, $"{MessagesRoute(conversationId)}?take=2");
        var firstItems = firstPage.GetProperty("items").EnumerateArray()
            .Select(m => m.GetProperty("body").GetString()).ToList();
        firstItems.Should().Equal("three", "two"); // newest-first

        var cursor = firstPage.GetProperty("nextCursor").GetString();
        cursor.Should().NotBeNullOrEmpty();

        var secondPage = await GetJsonAsync(couple.Client, $"{MessagesRoute(conversationId)}?take=2&before={cursor}");
        secondPage.GetProperty("items").EnumerateArray()
            .Select(m => m.GetProperty("body").GetString()).Should().Equal("one");
    }

    // ---- FR-14: media --------------------------------------------------------------------------

    [Fact]
    public async Task SendMedia_ShouldReturnImageMessageWithAttachment()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 1, 2, 3, 4 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        form.Add(fileContent, "file", "photo.jpg");
        form.Add(new StringContent("a caption"), "caption");

        var response = await couple.Client.PostAsync($"{MessagesRoute(conversationId)}/media", form);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        body.GetProperty("contentType").GetString().Should().Be("Image");
        body.GetProperty("attachment").GetProperty("url").GetString()
            .Should().Be("https://blob.test/messages/photo.jpg");
    }

    // ---- FR-17 / FR-18 / FR-19: edit & delete authority ----------------------------------------

    [Fact]
    public async Task EditMessage_BySender_ShouldMarkEdited()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);
        var messageId = await SendTextAsync(couple.Client, conversationId, "original");

        var edit = await couple.Client.PutAsJsonAsync(
            $"{MessagesRoute(conversationId)}/{messageId}", new { body = "edited" });

        edit.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await edit.Content.ReadFromJsonAsync<JsonElement>(Json);
        body.GetProperty("body").GetString().Should().Be("edited");
        body.GetProperty("isEdited").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task EditMessage_ByNonSenderPartner_ShouldReturn403()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);
        var messageId = await SendTextAsync(couple.Client, conversationId, "husband's message");

        // The wife (same couple, participant, but not the sender) may not edit.
        var wife = await LoginAsync(couple.WifeUsername);
        var edit = await wife.PutAsJsonAsync(
            $"{MessagesRoute(conversationId)}/{messageId}", new { body = "hijacked" });

        edit.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteMessage_BySender_ShouldTombstone()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);
        var messageId = await SendTextAsync(couple.Client, conversationId, "to be deleted");

        var delete = await couple.Client.DeleteAsync($"{MessagesRoute(conversationId)}/{messageId}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var page = await GetJsonAsync(couple.Client, MessagesRoute(conversationId));
        var message = page.GetProperty("items").EnumerateArray().Single();
        message.GetProperty("isDeleted").GetBoolean().Should().BeTrue();
        message.GetProperty("body").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // ---- FR-21 – FR-24: reactions --------------------------------------------------------------

    [Fact]
    public async Task ReactChangeAndRemove_ShouldBeReflectedInMessage()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);
        var messageId = await SendTextAsync(couple.Client, conversationId, "react to me");
        var reactionRoute = $"{MessagesRoute(conversationId)}/{messageId}/reaction";

        (await couple.Client.PutAsJsonAsync(reactionRoute, new { emoji = "heart" }))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await ReactionEmojisAsync(couple.Client, conversationId, messageId)).Should().Equal("heart");

        // Change replaces the prior reaction (still one per person).
        (await couple.Client.PutAsJsonAsync(reactionRoute, new { emoji = "laugh" }))
            .EnsureSuccessStatusCode();
        (await ReactionEmojisAsync(couple.Client, conversationId, messageId)).Should().Equal("laugh");

        (await couple.Client.DeleteAsync(reactionRoute)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await ReactionEmojisAsync(couple.Client, conversationId, messageId)).Should().BeEmpty();
    }

    [Fact]
    public async Task React_WithUncuratedEmoji_ShouldReturn400()
    {
        var couple = await RegisterAndLoginAsync();
        var conversationId = await PartnerConversationIdAsync(couple.Client);
        var messageId = await SendTextAsync(couple.Client, conversationId, "react");

        var response = await couple.Client.PutAsJsonAsync(
            $"{MessagesRoute(conversationId)}/{messageId}/reaction", new { emoji = "not-a-token" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ---- FR-25: couple isolation ---------------------------------------------------------------

    [Fact]
    public async Task GetConversation_ByNonParticipantCouple_ShouldReturn404()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        var aPartnerConversation = await PartnerConversationIdAsync(coupleA.Client);

        var response = await coupleB.Client.GetAsync($"/api/v1/conversations/{aPartnerConversation}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound); // 404, not 403 (D3)
    }

    [Fact]
    public async Task SendMessage_ToNonParticipantConversation_ShouldReturn404()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        var aPartnerConversation = await PartnerConversationIdAsync(coupleA.Client);

        var response = await coupleB.Client.PostAsJsonAsync(
            MessagesRoute(aPartnerConversation), new { body = "intruding" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- FR-4 / FR-6: create group -------------------------------------------------------------

    [Fact]
    public async Task CreateGroup_WithConnectedCouple_ShouldSucceedWithFourParticipants()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        await ConnectAsync(coupleA, coupleB);

        var conversationId = await CreateGroupAsync(coupleA.Client, "Trip", coupleB.CoupleId);

        var detail = await GetJsonAsync(coupleA.Client, $"/api/v1/conversations/{conversationId}");
        detail.GetProperty("type").GetString().Should().Be("Group");
        detail.GetProperty("participants").GetArrayLength().Should().Be(4);
        detail.GetProperty("isOwner").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task CreateGroup_WithUnconnectedCouple_ShouldReturn409()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        // No connection established.

        var response = await coupleA.Client.PostAsJsonAsync("/api/v1/conversations/group",
            new { name = "Trip", targetCoupleIds = new[] { coupleB.CoupleId } });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ---- FR-7: owner-only rename ---------------------------------------------------------------

    [Fact]
    public async Task Rename_ByOwner_ShouldSucceed_ByNonOwner_ShouldReturn403()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        await ConnectAsync(coupleA, coupleB);
        var conversationId = await CreateGroupAsync(coupleA.Client, "Trip", coupleB.CoupleId);

        var ownerRename = await coupleA.Client.PutAsJsonAsync(
            $"/api/v1/conversations/{conversationId}/name", new { name = "Beach Trip" });
        ownerRename.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var nonOwnerRename = await coupleB.Client.PutAsJsonAsync(
            $"/api/v1/conversations/{conversationId}/name", new { name = "Hijacked" });
        nonOwnerRename.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- FR-8: add couple ----------------------------------------------------------------------

    [Fact]
    public async Task AddCouple_WhenConnected_ShouldAddBothPartners()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        var coupleC = await RegisterAndLoginAsync();
        await ConnectAsync(coupleA, coupleB);
        await ConnectAsync(coupleA, coupleC);

        var conversationId = await CreateGroupAsync(coupleA.Client, "Trip", coupleB.CoupleId);

        var add = await coupleA.Client.PostAsJsonAsync(
            $"/api/v1/conversations/{conversationId}/couples", new { targetCoupleId = coupleC.CoupleId });
        add.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var detail = await GetJsonAsync(coupleA.Client, $"/api/v1/conversations/{conversationId}");
        detail.GetProperty("participants").GetArrayLength().Should().Be(6); // three couples × 2
    }

    // ---- FR-12: hide is per-couple -------------------------------------------------------------

    [Fact]
    public async Task Hide_ShouldRemoveConversationForActingCoupleOnly()
    {
        var coupleA = await RegisterAndLoginAsync();
        var coupleB = await RegisterAndLoginAsync();
        await ConnectAsync(coupleA, coupleB);
        var conversationId = await CreateGroupAsync(coupleA.Client, "Trip", coupleB.CoupleId);

        var hide = await coupleA.Client.DeleteAsync($"/api/v1/conversations/{conversationId}");
        hide.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listA = await GetConversationsAsync(coupleA.Client);
        listA.Should().NotContain(c => c.GetProperty("id").GetGuid() == conversationId);

        var listB = await GetConversationsAsync(coupleB.Client);
        listB.Should().Contain(c => c.GetProperty("id").GetGuid() == conversationId);
    }

    // ==== Helpers ================================================================================

    private static string MessagesRoute(Guid conversationId) =>
        $"/api/v1/conversations/{conversationId}/messages";

    private async Task<List<JsonElement>> GetConversationsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/v1/conversations");
        response.EnsureSuccessStatusCode();
        var array = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return array.EnumerateArray().ToList();
    }

    private async Task<Guid> PartnerConversationIdAsync(HttpClient client)
    {
        var conversations = await GetConversationsAsync(client);
        return conversations.First(c => c.GetProperty("type").GetString() == "Partner")
            .GetProperty("id").GetGuid();
    }

    private async Task<JsonElement> GetJsonAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }

    private async Task<Guid> SendTextAsync(HttpClient client, Guid conversationId, string body)
    {
        var response = await client.PostAsJsonAsync(MessagesRoute(conversationId), new { body });
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return dto.GetProperty("id").GetGuid();
    }

    private async Task<List<string?>> ReactionEmojisAsync(HttpClient client, Guid conversationId, Guid messageId)
    {
        var page = await GetJsonAsync(client, MessagesRoute(conversationId));
        var message = page.GetProperty("items").EnumerateArray()
            .First(m => m.GetProperty("id").GetGuid() == messageId);
        return message.GetProperty("reactions").EnumerateArray()
            .Select(r => r.GetProperty("emoji").GetString()).ToList();
    }

    private async Task<Guid> CreateGroupAsync(HttpClient client, string name, params Guid[] targetCoupleIds)
    {
        var response = await client.PostAsJsonAsync("/api/v1/conversations/group",
            new { name, targetCoupleIds });
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return dto.GetProperty("conversationId").GetGuid();
    }

    /// <summary>Couple A requests, couple B accepts → an Accepted connection between them.</summary>
    private async Task ConnectAsync(TestCouple a, TestCouple b)
    {
        var send = await a.Client.PostAsJsonAsync("/api/v1/connect/request",
            new { targetTogetherID = b.TogetherId });
        send.EnsureSuccessStatusCode();
        var connectionId = (await send.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("connectionId").GetGuid();

        var accept = await b.Client.PutAsync($"/api/v1/connect/request/{connectionId}/accept", null);
        accept.EnsureSuccessStatusCode();
    }

    private async Task<TestCouple> RegisterAndLoginAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var togetherId = $"TG-{suffix.ToUpperInvariant()}";
        var husbandUsername = $"h{suffix}";
        var wifeUsername = $"w{suffix}";

        var register = await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            togetherID = togetherId,
            husbandUsername,
            husbandName = "Test Husband",
            husbandDateOfBirth = "1990-01-01",
            husbandEmail = $"{husbandUsername}@test.com",
            husbandPhoneNumber = "+11234567890",
            wifeUsername,
            wifeName = "Test Wife",
            wifeDateOfBirth = "1992-06-15",
            wifeEmail = $"{wifeUsername}@test.com",
            wifePhoneNumber = "+19876543210",
            password = "SecurePass@123!",
            confirmPassword = "SecurePass@123!"
        });
        register.EnsureSuccessStatusCode();
        var coupleId = (await register.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("coupleId").GetGuid();

        var (client, partnerId) = await LoginWithPartnerAsync(husbandUsername);
        return new TestCouple(client, coupleId, partnerId, togetherId, husbandUsername, wifeUsername);
    }

    private async Task<HttpClient> LoginAsync(string username)
    {
        var (client, _) = await LoginWithPartnerAsync(username);
        return client;
    }

    private async Task<(HttpClient Client, Guid PartnerId)> LoginWithPartnerAsync(string username)
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/login",
            new { username, password = "SecurePass@123!" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        var token = body.GetProperty("accessToken").GetString();
        var partnerId = body.GetProperty("partnerId").GetGuid();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (client, partnerId);
    }

    public void Dispose() => _factory.Dispose();

    private sealed record TestCouple(
        HttpClient Client,
        Guid CoupleId,
        Guid PartnerId,
        string TogetherId,
        string HusbandUsername,
        string WifeUsername);
}
