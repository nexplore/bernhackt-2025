using MissionFourward.Shared;

var builder = DistributedApplication.CreateBuilder(args);


var azResourceGroupId = builder.AddParameter("azure-resource-group-id");
var azOpenAiName = /*"d-openai"; //*/builder.AddParameter("azure-openai-name");

var openai = builder.AddAzureOpenAI(AppConstants.ConnectionNames.OpenAI)
    .RunAsExisting(azOpenAiName, azResourceGroupId);


var openapiClient = openai.AddDeployment(
    AppConstants.ConnectionNames.OpenAIDefaultClient,
    "gpt-4.1-mini",
    "2025-04-14").WithProperties(e => { e.SkuName = "GlobalStandard"; });

var apiService = builder.AddProject<Projects.MissionFourward_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.MissionFourward_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)
    .WaitFor(apiService)
    .WithReference(openai, optional: true)
    .WithReference(openapiClient, optional: true)
    /*.WaitFor(openai)*/;

builder.Build().Run();