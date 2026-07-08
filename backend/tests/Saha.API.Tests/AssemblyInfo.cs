using Xunit;

// These are WebApplicationFactory<Program> integration tests. Spinning up several factories
// concurrently races on the shared host-entry-point resolver ("The entry point exited without ever
// building an IHost"), so run the assembly's tests sequentially.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
