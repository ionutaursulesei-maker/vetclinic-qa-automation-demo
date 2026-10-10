using System.Net;
using VetApi.Tests.Clients;
using VetApi.Tests.Support;

namespace VetApi.Tests.Tests;

/// <summary>
/// Interview talking point: "you inherit a broken legacy suite – what do you do?"
/// The BEFORE test reproduces three classic causes of flakiness found in old RestSharp suites.
/// It is [Explicit] so it never runs in CI; the AFTER test is the fixed version.
/// </summary>
[TestFixture]
[Category("api")]
public class LegacyStabilizationExample
{
    [Test, Explicit("Kept only to show what was wrong – do not run in CI")]
    public async Task Before_FlakyLegacyTest()
    {
        var client = new PetRestClient(TestConfig.ApiUrl);       // 1. never disposed
        var pet = PetFactory.NewPatient() with { Id = 1 };       // 2. fixed id on a shared backend
        await client.CreateAsync(pet);
        Thread.Sleep(3000);                                      // 3. blind sleep instead of a condition
        var res = await client.GetAsync(1);
        Assert.That(res.Data!.Name, Is.EqualTo(pet.Name));       // fails whenever someone else wrote id 1
    }

    [Test]
    public async Task After_StableVersion()
    {
        using var client = new PetRestClient(TestConfig.ApiUrl); // 1. disposed
        var pet = PetFactory.NewPatient();                       // 2. unique id per run
        await client.CreateAsync(pet);

        try
        {
            var res = await Wait.UntilAsync(() => client.GetAsync(pet.Id),   // 3. bounded poll on a condition
                r => r.StatusCode == HttpStatusCode.OK, because: "patient readable");
            Assert.That(res.Data!.Name, Is.EqualTo(pet.Name));
        }
        finally
        {
            await client.DeleteAsync(pet.Id);                    // 4. cleanup even on failure
        }
    }
}
