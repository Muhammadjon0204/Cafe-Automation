using Cafe.Application.Interfaces.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Cafe.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, Services.AuthService>();
        services.AddScoped<ICategoryService, Services.CategoryService>();
        services.AddScoped<ICustomerService, Services.CustomerService>();
        services.AddScoped<ICafeTableService, Services.CafeTableService>();
        services.AddScoped<IDashboardService, Services.DashboardService>();
        services.AddScoped<IDiscountService, Services.DiscountService>();
        services.AddScoped<IDishService, Services.DishService>();
        services.AddScoped<IOrderService, Services.OrderService>();
        services.AddScoped<IPaymentService, Services.PaymentService>();
        services.AddScoped<IReportService, Services.ReportService>();
        services.AddScoped<IReservationService, Services.ReservationService>();
        services.AddScoped<IStaffMemberService, Services.StaffMemberService>();
        services.AddScoped<ITipService, Services.TipService>();

        return services;
    }
}
