using Cafe.Application.Results;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(result);
        }

        return IsNotFound(result.Message) ? new NotFoundObjectResult(result) : new BadRequestObjectResult(result);
    }

    public static IActionResult ToActionResult(this Result result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(result);
        }

        return IsNotFound(result.Message) ? new NotFoundObjectResult(result) : new BadRequestObjectResult(result);
    }

    private static bool IsNotFound(string message)
    {
        return message.Contains("not found", StringComparison.OrdinalIgnoreCase);
    }
}
