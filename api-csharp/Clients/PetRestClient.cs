using RestSharp;
using VetApi.Tests.Models;

namespace VetApi.Tests.Clients;

/// <summary>
/// RestSharp: you build each request by hand. More verbose than Refit, but this is what
/// many "legacy" C# API suites look like, so it is worth being fluent in both.
/// </summary>
public sealed class PetRestClient : IDisposable
{
    private readonly RestClient _client;

    public PetRestClient(string baseUrl)
    {
        _client = new RestClient(new RestClientOptions(baseUrl)
        {
            Timeout = TimeSpan.FromSeconds(15),
            ThrowOnAnyError = false, // tests assert on status codes themselves
        });
        _client.AddDefaultHeader("Accept", "application/json");
    }

    public Task<RestResponse<Pet>> CreateAsync(Pet pet) =>
        _client.ExecuteAsync<Pet>(new RestRequest("pet", Method.Post).AddJsonBody(pet));

    public Task<RestResponse<Pet>> GetAsync(long id) =>
        _client.ExecuteAsync<Pet>(new RestRequest("pet/{id}").AddUrlSegment("id", id));

    public Task<RestResponse<ApiError>> GetErrorAsync(long id) =>
        _client.ExecuteAsync<ApiError>(new RestRequest("pet/{id}").AddUrlSegment("id", id));

    public Task<RestResponse> DeleteAsync(long id) =>
        _client.ExecuteAsync(new RestRequest("pet/{id}", Method.Delete).AddUrlSegment("id", id));

    public void Dispose() => _client.Dispose();
}
