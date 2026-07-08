using FluentAssertions;
using NSubstitute;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Commands.CreateGroupConversation;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;
using Xunit;

namespace Saha.Application.Tests.Features.Messaging;

public sealed class CreateGroupConversationHandlerTests
{
    private readonly IConversationRepository _conversations = Substitute.For<IConversationRepository>();
    private readonly ICoupleRepository _couples = Substitute.For<ICoupleRepository>();
    private readonly IConnectionRepository _connections = Substitute.For<IConnectionRepository>();
    private readonly IAuditLogger _audit = Substitute.For<IAuditLogger>();
    private readonly ICurrentUserContext _currentUser = Substitute.For<ICurrentUserContext>();

    private readonly Couple _requester = MessagingTestData.MakeCouple("REQ-COUPLE");
    private readonly Couple _target = MessagingTestData.MakeCouple("TGT-COUPLE");
    private readonly CreateGroupConversationCommandHandler _handler;

    public CreateGroupConversationHandlerTests()
    {
        _currentUser.CoupleId.Returns(_requester.Id);
        _currentUser.PartnerId.Returns(_requester.Husband.Id);
        _couples.GetByIdAsync(_requester.Id, Arg.Any<CancellationToken>()).Returns(_requester);
        _couples.GetByIdAsync(_target.Id, Arg.Any<CancellationToken>()).Returns(_target);

        _handler = new CreateGroupConversationCommandHandler(
            _conversations, _couples, _connections, _audit, _currentUser);
    }

    [Fact] // FR-4
    public async Task Handle_WhenConnected_CreatesGroupWithAllFourPartners()
    {
        _connections.GetBetweenCouplesAsync(_requester.Id, _target.Id, Arg.Any<CancellationToken>())
            .Returns(MessagingTestData.AcceptedConnection(_requester, _target));

        var result = await _handler.Handle(
            new CreateGroupConversationCommand("Trip", new[] { _target.Id }), CancellationToken.None);

        result.ConversationId.Should().NotBeEmpty();
        await _conversations.Received(1).AddAsync(
            Arg.Is<Conversation>(c => c.Participants.Count == 4 && c.OwnerCoupleId == _requester.Id),
            Arg.Any<CancellationToken>());
    }

    [Fact] // FR-4 — connection gate
    public async Task Handle_WhenNotConnected_ThrowsConflict()
    {
        _connections.GetBetweenCouplesAsync(_requester.Id, _target.Id, Arg.Any<CancellationToken>())
            .Returns((CoupleConnection?)null);

        var act = () => _handler.Handle(
            new CreateGroupConversationCommand("Trip", new[] { _target.Id }), CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .Where(e => e.ConflictCode == "NOT_CONNECTED");
        await _conversations.DidNotReceive().AddAsync(Arg.Any<Conversation>(), Arg.Any<CancellationToken>());
    }

    [Fact] // FR-5 — pending (non-accepted) connection is not enough
    public async Task Handle_WhenConnectionPendingNotAccepted_ThrowsConflict()
    {
        var pending = CoupleConnection.CreateRequest(_requester.Id, _target.Id, _requester.TogetherID, _target.TogetherID);
        _connections.GetBetweenCouplesAsync(_requester.Id, _target.Id, Arg.Any<CancellationToken>())
            .Returns(pending);

        var act = () => _handler.Handle(
            new CreateGroupConversationCommand("Trip", new[] { _target.Id }), CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>();
    }
}
