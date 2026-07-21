using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Connect.Commands.AcceptConnectionRequest;
using Saha.Application.Features.Connect.Commands.RejectConnectionRequest;
using Saha.Application.Features.Connect.Commands.SendConnectionRequest;
using Saha.Application.Features.Connect.Queries.GetConnections;
using Saha.Application.Features.Connect.Queries.SearchCouple;
using Saha.Domain.Enums;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public sealed class ConnectController : ApiControllerBase
{
    private readonly ICurrentUserContext _currentUser;

    public ConnectController(ICurrentUserContext currentUser)
    {
        _currentUser = currentUser;
    }

    [HttpGet("connections")]
    [ProducesResponseType(typeof(IReadOnlyList<ConnectionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConnections(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        // An unparseable filter must not be silently dropped: doing so widens the result set to
        // "all connections" and the caller has no way to notice it asked for something else.
        ConnectionRequestStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ConnectionRequestStatus>(status, true, out var parsed)
                || !Enum.IsDefined(parsed))
            {
                throw new ApplicationValidationException(
                    new Dictionary<string, string[]>
                    {
                        [nameof(status)] =
                        [
                            $"Status must be one of: {string.Join(", ", Enum.GetNames<ConnectionRequestStatus>())}.",
                        ],
                    });
            }

            parsedStatus = parsed;
        }

        var query = new GetConnectionsQuery(_currentUser.CoupleId, parsedStatus);
        var result = await Sender.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<CoupleSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string togetherId,
        CancellationToken cancellationToken)
    {
        var query = new SearchCoupleQuery(togetherId, _currentUser.CoupleId);
        var result = await Sender.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost("request")]
    [ProducesResponseType(typeof(SendConnectionRequestResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SendRequest(
        [FromBody] SendConnectionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SendConnectionRequestCommand(
            _currentUser.CoupleId,
            request.TargetTogetherID);

        var result = await Sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(SendRequest), result);
    }

    [HttpPut("request/{connectionId:guid}/accept")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcceptRequest(
        Guid connectionId,
        CancellationToken cancellationToken)
    {
        await Sender.Send(
            new AcceptConnectionRequestCommand(connectionId, _currentUser.CoupleId),
            cancellationToken);
        return NoContent();
    }

    [HttpPut("request/{connectionId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectRequest(
        Guid connectionId,
        CancellationToken cancellationToken)
    {
        await Sender.Send(
            new RejectConnectionRequestCommand(connectionId, _currentUser.CoupleId),
            cancellationToken);
        return NoContent();
    }
}

public sealed record SendConnectionRequest(string TargetTogetherID);
