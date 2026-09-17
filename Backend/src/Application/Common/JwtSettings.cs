namespace Cafe.Application.Common;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 7;

    // Client-app (customer) sessions stay logged in far longer than staff ones - the customer
    // is on their own device and expects "log in once, stay in for a while", staff share
    // shared/POS terminals where a shorter session is the safer default. Only the refresh
    // token's lifetime differs; AccessTokenMinutes above is shared by both.
    public int ClientRefreshTokenDays { get; set; } = 30;
}
