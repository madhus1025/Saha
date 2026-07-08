using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Saha.Application.Features.Messaging.Commands.AddCoupleToConversation;
using Saha.Application.Features.Messaging.Commands.CreateGroupConversation;
using Saha.Application.Features.Messaging.Commands.HideConversation;
using Saha.Application.Features.Messaging.Commands.RenameConversation;
using Saha.Application.Features.Messaging.Commands.SetConversationPin;
using Saha.Application.Features.Messaging.Common;
using Saha.Application.Features.Messaging.Queries.GetConversationDetail;
using Saha.Application.Features.Messaging.Queries.GetConversations;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/conversations")]
public sealed class ConversationsController : ApiControllerBase
{
    // Acting couple/partner are read from ICurrentUserContext inside each handler; actions stay thin.

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ConversationSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        var result = await Sender.Send(new GetConversationsQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ConversationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetConversation(Guid id, CancellationToken cancellationToken)
    {
        var result = await Sender.Send(new GetConversationDetailQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPost("group")]
    [ProducesResponseType(typeof(CreateGroupConversationResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateGroup(
        [FromBody] CreateGroupRequest request,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            new CreateGroupConversationCommand(request.Name, request.TargetCoupleIds),
            cancellationToken);
        return CreatedAtAction(nameof(GetConversation), new { id = result.ConversationId }, result);
    }

    [HttpPut("{id:guid}/name")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Rename(
        Guid id,
        [FromBody] RenameConversationRequest request,
        CancellationToken cancellationToken)
    {
        await Sender.Send(new RenameConversationCommand(id, request.Name), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/couples")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddCouple(
        Guid id,
        [FromBody] AddCoupleRequest request,
        CancellationToken cancellationToken)
    {
        await Sender.Send(new AddCoupleToConversationCommand(id, request.TargetCoupleId), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Pin(Guid id, CancellationToken cancellationToken)
    {
        await Sender.Send(new SetConversationPinCommand(id, IsPinned: true), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/unpin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpin(Guid id, CancellationToken cancellationToken)
    {
        await Sender.Send(new SetConversationPinCommand(id, IsPinned: false), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Hide(Guid id, CancellationToken cancellationToken)
    {
        await Sender.Send(new HideConversationCommand(id), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateGroupRequest(string Name, IReadOnlyList<Guid> TargetCoupleIds);
public sealed record RenameConversationRequest(string Name);
public sealed record AddCoupleRequest(Guid TargetCoupleId);
