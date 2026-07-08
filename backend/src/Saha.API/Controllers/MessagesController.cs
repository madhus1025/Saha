using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Saha.Application.Features.Messaging.Commands.DeleteMessage;
using Saha.Application.Features.Messaging.Commands.EditMessage;
using Saha.Application.Features.Messaging.Commands.ReactToMessage;
using Saha.Application.Features.Messaging.Commands.RemoveReaction;
using Saha.Application.Features.Messaging.Commands.SendMediaMessage;
using Saha.Application.Features.Messaging.Commands.SendTextMessage;
using Saha.Application.Features.Messaging.Common;
using Saha.Application.Features.Messaging.Queries.GetMessages;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/conversations/{conversationId:guid}/messages")]
public sealed class MessagesController : ApiControllerBase
{
    // 50 MB covers the largest allowed media (video); per-type caps are enforced in the handler.
    private const long MaxMediaBytes = 52_428_800;

    [HttpGet]
    [ProducesResponseType(typeof(MessagePageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMessages(
        Guid conversationId,
        [FromQuery] string? before,
        [FromQuery] int take = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(new GetMessagesQuery(conversationId, before, take), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendText(
        Guid conversationId,
        [FromBody] SendTextMessageRequest request,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            new SendTextMessageCommand(conversationId, request.Body), cancellationToken);
        return CreatedAtAction(nameof(GetMessages), new { conversationId }, result);
    }

    [HttpPost("media")]
    [RequestSizeLimit(MaxMediaBytes)]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    public async Task<IActionResult> SendMedia(
        Guid conversationId,
        IFormFile file,
        [FromForm] string? caption,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await Sender.Send(
            new SendMediaMessageCommand(
                conversationId, stream, file.FileName, file.ContentType, file.Length, caption),
            cancellationToken);
        return CreatedAtAction(nameof(GetMessages), new { conversationId }, result);
    }

    [HttpPut("{messageId:guid}")]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Edit(
        Guid conversationId,
        Guid messageId,
        [FromBody] EditMessageRequest request,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            new EditMessageCommand(conversationId, messageId, request.Body), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{messageId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid conversationId,
        Guid messageId,
        CancellationToken cancellationToken)
    {
        await Sender.Send(new DeleteMessageCommand(conversationId, messageId), cancellationToken);
        return NoContent();
    }

    [HttpPut("{messageId:guid}/reaction")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> React(
        Guid conversationId,
        Guid messageId,
        [FromBody] ReactRequest request,
        CancellationToken cancellationToken)
    {
        await Sender.Send(
            new ReactToMessageCommand(conversationId, messageId, request.Emoji), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{messageId:guid}/reaction")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveReaction(
        Guid conversationId,
        Guid messageId,
        CancellationToken cancellationToken)
    {
        await Sender.Send(new RemoveReactionCommand(conversationId, messageId), cancellationToken);
        return NoContent();
    }
}

public sealed record SendTextMessageRequest(string Body);
public sealed record EditMessageRequest(string Body);
public sealed record ReactRequest(string Emoji);
