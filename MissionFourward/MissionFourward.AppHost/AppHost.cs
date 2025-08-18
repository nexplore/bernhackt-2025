
using MissionFourward.Shared;

var builder = DistributedApplication.CreateBuilder(args);

var openai = builder.AddAzureOpenAI(AppConstants.ConnectionNames.OpenAI).AddDeployment(
    name: AppConstants.ConnectionNames.OpenAIDefaultClient,
    modelName: "gpt-4-1-mini",
    modelVersion: "2025-04-14");

var apiService = builder.AddProject<Projects.MissionFourward_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.MissionFourward_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)
    .WaitFor(apiService)
    .WithReference(openai)
    /*.WaitFor(openai)*/;

builder.Build().Run();