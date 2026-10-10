using System.Net;
using Refit;
using VetApi.Tests.Clients;
using VetApi.Tests.Models;
using VetApi.Tests.Support;

namespace VetApi.Tests.Tests;

[TestFixture]
[Category("api")]
[Parallelizable(ParallelScope.All)]
public class PetRefitTests
{
    private IPetApi _api = null!;
    private readonly List<long> _createdIds = new();

    [OneTimeSetUp]
    public void CreateClient() => _api = RestService.For<IPetApi>(TestConfig.ApiUrl.TrimEnd('/'));

    [OneTimeTearDown]
    public async Task CleanUp()
    {
        // Teardown runs even when tests fail – keeps the shared backend clean.
        foreach (var id in _createdIds) await _api.DeleteAsync(id);
    }

    private async Task<Pet> RegisterPatientAsync(string status = "available")
    {
        var pet = PetFactory.NewPatient(status);
        var created = await _api.CreateAsync(pet);
        Assert.That(created.StatusCode, Is.EqualTo(HttpStatusCode.OK), "setup: create patient");
        lock (_createdIds) _createdIds.Add(pet.Id);

        await Wait.UntilAsync(() => _api.GetAsync(pet.Id), r => r.IsSuccessStatusCode,
            because: $"pet {pet.Id} readable after create");
        return pet;
    }

    [Test, Category("smoke")]
    public async Task Create_ReturnsThePatientUnchanged()
    {
        var pet = PetFactory.NewPatient("pending");

        var response = await _api.CreateAsync(pet);
        lock (_createdIds) _createdIds.Add(pet.Id);

        Assert.Multiple(() =>
        {
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
            Assert.That(response.Content!.Name, Is.EqualTo(pet.Name));
            Assert.That(response.Content.Status, Is.EqualTo("pending"));
            Assert.That(response.Content.Category!.Name, Is.EqualTo(pet.Category!.Name));
        });
    }

    [Test, Category("smoke")]
    public async Task Get_ReturnsRegisteredPatient()
    {
        var pet = await RegisterPatientAsync();

        var response = await _api.GetAsync(pet.Id);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(response.Content!.Name, Is.EqualTo(pet.Name));
    }

    [Test]
    public async Task Update_DischargesThePatient()
    {
        var pet = await RegisterPatientAsync();

        var update = await _api.UpdateAsync(pet with { Status = "sold" });
        Assert.That(update.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        // Read back: the PUT echo alone proves nothing about persistence.
        var stored = await Wait.UntilAsync(() => _api.GetAsync(pet.Id),
            r => r.Content?.Status == "sold", because: "status persisted as sold");
        Assert.That(stored.Content!.Status, Is.EqualTo("sold"));
    }

    [TestCase("available")]
    [TestCase("pending")]
    [TestCase("sold")]
    public async Task FindByStatus_OnlyReturnsMatchingStatus(string status)
    {
        var response = await _api.FindByStatusAsync(status);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(response.Content, Is.Not.Empty);
        Assert.That(response.Content!.All(p => p.Status == status), Is.True,
            $"every pet returned for '{status}' should have that status");
    }

    [Test]
    public async Task Get_UnknownId_Returns404()
    {
        var response = await _api.GetAsync(PetFactory.UniqueId());

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(response.Error, Is.Not.Null, "Refit exposes the failure instead of throwing");
    }
}
