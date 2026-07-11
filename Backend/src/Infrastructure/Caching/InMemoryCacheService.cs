using System.Collections.Concurrent;
using Cafe.Application.Interfaces.Cache;

namespace Cafe.Infrastructure.Caching;

// Process-local cache: fine for a single-instance API. If this ever runs behind a load
// balancer with multiple instances, swap this for a distributed cache (e.g. Redis) behind
// the same ICacheService interface — nothing above this layer would need to change.
public class InMemoryCacheService : ICacheService
{
    private readonly ConcurrentDictionary<string, (object? Value, DateTime ExpiresAt)> _store = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (_store.TryGetValue(key, out var entry))
        {
            if (entry.ExpiresAt > DateTime.UtcNow)
            {
                return Task.FromResult((T?)entry.Value);
            }

            _store.TryRemove(key, out _);
        }

        return Task.FromResult(default(T));
    }

    public Task SetAsync<T>(string key, T value, TimeSpan expiration, CancellationToken cancellationToken = default)
    {
        _store[key] = (value, DateTime.UtcNow.Add(expiration));
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _store.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        foreach (var key in _store.Keys.Where(x => x.StartsWith(prefix, StringComparison.Ordinal)))
        {
            _store.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }
}
