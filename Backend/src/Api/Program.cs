using System.Text;
using Cafe.Api.Middleware;
using Cafe.Api.Services;
using Cafe.Application;
using Cafe.Application.Common;
using Cafe.Application.DTOs.Auth;
using Cafe.Application.Interfaces.Identity;
using Cafe.Domain.Constants;
using Cafe.Infrastructure;
using Cafe.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtSettings.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

// Secure by default: every endpoint requires an authenticated user unless it carries
// [AllowAnonymous] (public menu browsing, login/refresh, public reservation booking).
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Cafe Automation API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in SystemRoles.All)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    // Bootstraps the very first Admin account so the system isn't stuck behind the
    // "Register requires an existing Admin" chicken-and-egg problem. Only fires when no
    // Admin exists yet and credentials are configured (DefaultAdmin section) — a no-op
    // in Production unless that section is explicitly set.
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var existingAdmins = await userManager.GetUsersInRoleAsync(SystemRoles.Admin);
    if (existingAdmins.Count == 0)
    {
        var defaultAdmin = builder.Configuration.GetSection("DefaultAdmin");
        var adminEmail = defaultAdmin["Email"];
        var adminPassword = defaultAdmin["Password"];

        if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
        {
            var identityService = scope.ServiceProvider.GetRequiredService<IIdentityService>();
            await identityService.RegisterAsync(new RegisterUserDto
            {
                Email = adminEmail,
                Password = adminPassword,
                FirstName = string.IsNullOrWhiteSpace(defaultAdmin["FirstName"]) ? "Default" : defaultAdmin["FirstName"]!,
                LastName = string.IsNullOrWhiteSpace(defaultAdmin["LastName"]) ? "Admin" : defaultAdmin["LastName"]!,
                Role = SystemRoles.Admin
            });
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

// Serves zone floor-plan background images uploaded via ZonesController (wwwroot/uploads/zones).
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
