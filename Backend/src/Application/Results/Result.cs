namespace Cafe.Application.Results;

public class Result
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<string> Errors { get; set; } = new List<string>();

    public static Result Success(string message = "Success")
    {
        return new Result
        {
            IsSuccess = true,
            Message = message
        };
    }

    public static Result Failure(string message)
    {
        return new Result
        {
            IsSuccess = false,
            Message = message,
            Errors = new List<string> { message }
        };
    }

    public static Result Failure(string message, List<string> errors)
    {
        return new Result
        {
            IsSuccess = false,
            Message = message,
            Errors = errors
        };
    }
}
