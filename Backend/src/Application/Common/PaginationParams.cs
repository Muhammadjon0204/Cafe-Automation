namespace Cafe.Application.Common;

public class PaginationParams
{
    private int _pageNumber = 1;
    private int _pageSize = 10;

    public int PageNumber
    {
        get => _pageNumber;
        set => _pageNumber = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set
        {
            if (value < 1)
            {
                _pageSize = 1;
                return;
            }

            _pageSize = value > 100 ? 100 : value;
        }
    }
}
