using Saha.Domain.Entities;

namespace Saha.Domain.Interfaces.Repositories;

public interface ICoupleRepository
{
    Task<Couple?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Couple?> GetByTogetherIDAsync(string togetherID, CancellationToken cancellationToken = default);
    Task<Couple?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<Couple?> GetByUsernameWithTokensAsync(string username, CancellationToken cancellationToken = default);
    Task<Couple?> GetByIdWithTokensAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Couple?> GetByRefreshTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<bool> ExistsByTogetherIDAsync(string togetherID, CancellationToken cancellationToken = default);
    Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Couple>> SearchByTogetherIDAsync(string partialTogetherID, int limit, CancellationToken cancellationToken = default);
    Task AddAsync(Couple couple, CancellationToken cancellationToken = default);
    Task UpdateAsync(Couple couple, CancellationToken cancellationToken = default);
}
