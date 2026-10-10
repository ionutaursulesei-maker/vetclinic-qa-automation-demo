using System.Diagnostics;
using VetApi.Tests.Models;

namespace VetApi.Tests.Support;

public static class TestConfig
{
    public static string ApiUrl =>
        Environment.GetEnvironmentVariable("API_URL") ?? "https://petstore.swagger.io/v2/";
}

public static class PetFactory
{
    private static readonly string[] Species = { "Dog", "Cat", "Rabbit" };

    /// <summary>Unique id per call – never reuse fixed ids against a shared backend.</summary>
    public static long UniqueId() =>
        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000 + Random.Shared.Next(1000);

    public static Pet NewPatient(string status = "available")
    {
        var species = Species[Random.Shared.Next(Species.Length)];
        return new Pet(
            Id: UniqueId(),
            Name: $"QA-{species}-{Guid.NewGuid().ToString("N")[..5]}",
            Category: new Category(1, species),
            PhotoUrls: new List<string>(),
            Tags: new List<Tag> { new(1, "vetclinic-demo") },
            Status: status);
    }
}

public static class Wait
{
    /// <summary>
    /// Bounded polling for eventually consistent reads. Replaces Thread.Sleep(5000) –
    /// fast when the backend is fast, and fails with a clear message when it never converges.
    /// </summary>
    public static async Task<T> UntilAsync<T>(Func<Task<T>> action, Func<T, bool> isDone,
        TimeSpan? timeout = null, string? because = null)
    {
        var limit = timeout ?? TimeSpan.FromSeconds(10);
        var sw = Stopwatch.StartNew();
        var delay = TimeSpan.FromMilliseconds(250);
        T last;
        do
        {
            last = await action();
            if (isDone(last)) return last;
            await Task.Delay(delay);
            delay = TimeSpan.FromMilliseconds(Math.Min(delay.TotalMilliseconds * 2, 1000));
        } while (sw.Elapsed < limit);

        throw new TimeoutException($"Condition not met after {limit.TotalSeconds}s: {because}");
    }
}
