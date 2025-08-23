using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.PowerPlatform.Dataverse.Client.Model;

namespace MissionFourward.Core.Dataverse;

public static class Extensions
{
    public static void AddCrmOrgContext(this IServiceCollection services, IConfiguration configuration)
    {
        // TODO
        // ServiceClient client = new (new ConnectionOptions()
        // {
        //     AccessTokenProviderFunctionAsync = 
        // })
    }
    
    
}