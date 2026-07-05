using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;

namespace Saha.Infrastructure.Services.Auth;

public sealed class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(Couple couple, Partner partner)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]
                ?? throw new InvalidOperationException("JWT secret key is not configured.")));

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, partner.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new Claim("coupleId", couple.Id.ToString()),
            new Claim("partnerId", partner.Id.ToString()),
            new Claim("username", partner.Username),
            new Claim("togetherId", couple.TogetherID),
            new Claim("role", partner.Role.ToString()),
            new Claim("partnerName", partner.Name)
        };

        var ttl = _configuration.GetValue("Jwt:AccessTokenTtlMinutes", 15);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(ttl),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    public ClaimsResult? ValidateAccessToken(string accessToken)
    {
        try
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(accessToken, validationParameters, out _);

            var coupleId = Guid.Parse(principal.FindFirstValue("coupleId")!);
            var partnerId = Guid.Parse(principal.FindFirstValue("partnerId")!);
            var username = principal.FindFirstValue("username")!;
            var togetherId = principal.FindFirstValue("togetherId")!;
            var role = principal.FindFirstValue("role")!;

            return new ClaimsResult(coupleId, partnerId, username, togetherId, role);
        }
        catch
        {
            return null;
        }
    }
}
