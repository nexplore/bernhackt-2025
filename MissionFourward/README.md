# Mission Fourward - TBD


## Setting up local development

### Prerequisites
- DOTNET SDK 9
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)

### Before you start
- Run `az login` to authenticate with Azure.

### Generate CRM client model
- Install the pac tool: `dotnet tool update --global Microsoft.PowerApps.CLI.Tool`
- Authenticate: `pac auth create --environment https://orgbd708c7c.crm4.dynamics.com`
- Run `generate-crm-model.cmd` in `tools` directory.