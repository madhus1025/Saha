using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Saha.API.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _sender;

    protected ISender Sender =>
        _sender ??= HttpContext.RequestServices.GetRequiredService<ISender>();
}
