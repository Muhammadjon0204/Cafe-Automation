using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);

    Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);

    void Update(RefreshToken refreshToken);

    Task RevokeAllForStaffMemberAsync(int staffMemberId, CancellationToken cancellationToken = default);
}
