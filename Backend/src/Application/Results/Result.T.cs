namespace Cafe.Application.Results;

public class Result<T>
{
    public bool IsSuccess { get; set; }

    public string Message { get; set; } = string.Empty;

    public T? Data { get; set; }

    public List<string> Errors { get; set; } = new List<string>();

    public static Result<T> Success(T data, string message = "Success")
    {
        return new Result<T>
        {
            IsSuccess = true,
            Message = message,
            Data = data
        };
    }

    public static Result<T> Failure(string message)
    {
        return new Result<T>
        {
            IsSuccess = false,
            Message = message,
            Errors = new List<string> { message }
        };
    }

    public static Result<T> Failure(string message, List<string> errors)
    {
        return new Result<T>
        {
            IsSuccess = false,
            Message = message,
            Errors = errors
        };
    }
}
