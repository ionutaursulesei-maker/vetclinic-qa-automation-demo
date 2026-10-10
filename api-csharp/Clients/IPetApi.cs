using Refit;
using VetApi.Tests.Models;

namespace VetApi.Tests.Clients;

/// <summary>
/// Refit: you describe the API as an interface, Refit generates the HTTP client at build time.
/// Returning ApiResponse&lt;T&gt; (instead of T) keeps the status code and headers available,
/// and does NOT throw on 4xx/5xx – which is what a test usually wants.
/// </summary>
[Headers("Accept: application/json")]
public interface IPetApi
{
    [Post("/pet")]
    Task<ApiResponse<Pet>> CreateAsync([Body] Pet pet);

    [Get("/pet/{id}")]
    Task<ApiResponse<Pet>> GetAsync(long id);

    [Put("/pet")]
    Task<ApiResponse<Pet>> UpdateAsync([Body] Pet pet);

    [Delete("/pet/{id}")]
    Task<IApiResponse> DeleteAsync(long id);

    [Get("/pet/findByStatus")]
    Task<ApiResponse<List<Pet>>> FindByStatusAsync([Query] string status);
}
