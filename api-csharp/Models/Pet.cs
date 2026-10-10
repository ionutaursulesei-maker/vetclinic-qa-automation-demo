using System.Text.Json.Serialization;

namespace VetApi.Tests.Models;

// Records give value equality and immutability for free – handy for "what I sent == what I got" asserts.
public record Category(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("name")] string Name);

public record Tag(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("name")] string Name);

public record Pet(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("category")] Category? Category,
    [property: JsonPropertyName("photoUrls")] List<string> PhotoUrls,
    [property: JsonPropertyName("tags")] List<Tag>? Tags,
    [property: JsonPropertyName("status")] string Status);

public record ApiError(
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("message")] string Message);
