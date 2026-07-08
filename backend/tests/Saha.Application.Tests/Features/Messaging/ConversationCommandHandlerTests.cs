using FluentAssertions;
using NSubstitute;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Commands.AddCoupleToConversation;
using Saha.Application.Features.Messaging.Commands.HideConversation;
using Saha.Application.Features.Messaging.Commands.RenameConversation;
using Saha.Application.Features.Messaging.Commands.SetConversationPin;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;
using Xunit;

namespace Saha.Application.Tests.Features.Messaging;

public sealed class ConversationCommandHandlerTests
{
    private readonly IConversationRepository _conversations = Substitute.For<IConversationRepository>();
    private readonly ICoupleRepository _couples = Substitute.For<ICoupleRepository>();
    private readonly IConnectionRepository _connections = Substitute.For<IConnectionRepository>();
    private readonly IAuditLogger _audit = Substitute.For<IAuditLogger>();
    private readonly ICurrentUserContext _currentUser = Substitute.For<ICurrentUserContext>();

    private readonly Couple _owner = MessagingTestData.MakeCouple("OWN-COUPLE");
    private readonly Couple _member = MessagingTestData.MakeCouple("MEM-COUPLE");
    private readonly Couple _outsider = MessagingTestData.MakeCouple("OUT-COUPLE");
    private readonly Conversation _group;

    public ConversationCommandHandlerTests()
    {
        _group = MessagingTestData.MakeGroup(_owner, _member);
        _conversations.GetByIdAsync(_group.Id, Arg.Any<CancellationToken>()).Returns(_group);
        _currentUser.PartnerId.Returns(_owner.Husband.Id);
    }

    private void ActAs(Couple couple) => _currentUser.CoupleId.Returns(couple.Id);

    // FR-25 isolation — non-participant sees 404
    [Fact]
    public async Task Rename_ByNonParticipant_ThrowsNotFound()
    {
        ActAs(_outsider);
        var handler = new RenameConversationCommandHandler(_conversations, _audit, _currentUser);

        var act = () => handler.Handle(new RenameConversationCommand(_group.Id, "X"), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // FR-7 — non-owner rename → 403
    [Fact]
    public async Task Rename_ByNonOwnerParticipant_ThrowsForbidden()
    {
        ActAs(_member);
        var handler = new RenameConversationCommandHandler(_conversations, _audit, _currentUser);

        var act = () => handler.Handle(new RenameConversationCommand(_group.Id, "X"), CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    // FR-7 — owner rename succeeds
    [Fact]
    public async Task Rename_ByOwner_UpdatesName()
    {
        ActAs(_owner);
        var handler = new RenameConversationCommandHandler(_conversations, _audit, _currentUser);

        await handler.Handle(new RenameConversationCommand(_group.Id, "Renamed"), CancellationToken.None);

        _group.Name.Should().Be("Renamed");
        await _conversations.Received(1).UpdateAsync(_group, Arg.Any<CancellationToken>());
    }

    // FR-8 — add couple requires acting-couple connection
    [Fact]
    public async Task AddCouple_WhenNotConnected_ThrowsConflict()
    {
        ActAs(_member);
        _connections.GetBetweenCouplesAsync(_member.Id, _outsider.Id, Arg.Any<CancellationToken>())
            .Returns((CoupleConnection?)null);
        var handler = new AddCoupleToConversationCommandHandler(
            _conversations, _couples, _connections, _audit, _currentUser);

        var act = () => handler.Handle(
            new AddCoupleToConversationCommand(_group.Id, _outsider.Id), CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>();
    }

    // FR-8 — any participant can add an eligible couple
    [Fact]
    public async Task AddCouple_ByParticipantWhenConnected_AddsBothPartners()
    {
        ActAs(_member);
        _connections.GetBetweenCouplesAsync(_member.Id, _outsider.Id, Arg.Any<CancellationToken>())
            .Returns(MessagingTestData.AcceptedConnection(_member, _outsider));
        _couples.GetByIdAsync(_outsider.Id, Arg.Any<CancellationToken>()).Returns(_outsider);
        var handler = new AddCoupleToConversationCommandHandler(
            _conversations, _couples, _connections, _audit, _currentUser);

        await handler.Handle(new AddCoupleToConversationCommand(_group.Id, _outsider.Id), CancellationToken.None);

        _group.HasCoupleParticipant(_outsider.Id).Should().BeTrue();
        _group.Participants.Should().HaveCount(6);
    }

    // FR-12 — hide affects only the acting couple's state
    [Fact]
    public async Task Hide_SetsHiddenForActingCoupleOnly()
    {
        ActAs(_member);
        var handler = new HideConversationCommandHandler(_conversations, _audit, _currentUser);

        await handler.Handle(new HideConversationCommand(_group.Id), CancellationToken.None);

        _group.IsHiddenFor(_member.Id).Should().BeTrue();
        _group.IsHiddenFor(_owner.Id).Should().BeFalse();
    }

    // FR-11 — pin toggles per couple
    [Fact]
    public async Task Pin_SetsPinnedForActingCouple()
    {
        ActAs(_member);
        var handler = new SetConversationPinCommandHandler(_conversations, _currentUser);

        await handler.Handle(new SetConversationPinCommand(_group.Id, true), CancellationToken.None);

        _group.IsPinnedFor(_member.Id).Should().BeTrue();
    }
}
