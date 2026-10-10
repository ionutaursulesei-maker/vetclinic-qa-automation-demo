using System.Net;
using VetApi.Tests.Clients;
using VetApi.Tests.Support;

namespace VetApi.Tests.Tests;

[TestFixture]
[Category("api")]
public class PetRestSharpTests
{
    private PetRestClient _client = null!;

    [SetUp]
    public void SetUp() => _client = new PetRestClient(TestConfig.ApiUrl);

    [TearDown]
    public void TearDown() => _client.Dispose();

    [Test, Category("smoke")]
    public async Task CreateThenDelete_PatientIsGone()
    {
        var pet = PetFactory.NewPatient();

        var created = await _client.CreateAsync(pet);
        Assert.That(created.StatusCode, Is.EqualTo(HttpStatusCode.OK), created.Content);
        await Wait.UntilAsync(() => _client.GetAsync(pet.Id), r => r.IsSuccessStatusCode,
            because: "patient readable after create");

        var deleted = await _client.DeleteAsync(pet.Id);
        Assert.That(deleted.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var after = await Wait.UntilAsync(() => _client.GetAsync(pet.Id),
            r => r.StatusCode == HttpStatusCode.NotFound, because: "patient gone after delete");
        Assert.That(after.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task UnknownPatient_ReturnsErrorContract()
    {
        var response = await _client.GetErrorAsync(PetFactory.UniqueId());

        Assert.Multiple(() =>
        {
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
            Assert.That(response.Data!.Type, Is.EqualTo("error"));
            Assert.That(response.Data.Message, Is.EqualTo("Pet not found"));
        });
    }

    [Test]
    public async Task Get_RespondsWithinLatencyBudget()
    {
        var pet = PetFactory.NewPatient();
        await _client.CreateAsync(pet);

        var sw = System.Diagnostics.Stopwatch.StartNew();
        await _client.GetAsync(pet.Id);
        sw.Stop();

        Assert.That(sw.ElapsedMilliseconds, Is.LessThan(3000), "public demo API – real budget comes from the SLO");
        await _client.DeleteAsync(pet.Id);
    }
}
