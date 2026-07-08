const MAILPIT_URL = 'http://localhost:8025'

export default async function globalSetup() {
  // Verify Mailpit is running
  try {
    const res = await fetch(`${MAILPIT_URL}/api/v1/info`)
    if (!res.ok) throw new Error()
  } catch {
    throw new Error(
      '\n\n❌ Mailpit is not running.\n' +
      'Install it:  brew install mailpit\n' +
      'Then run:    mailpit\n' +
      'Mailpit UI:  http://localhost:8025\n',
    )
  }

  // Verify backend is running — try all common dev ports
  try {
    const ports = [5000, 5001, 7001]
    let up = false
    for (const port of ports) {
      try {
        const proto = port === 7001 ? 'https' : 'http'
        const res = await fetch(`${proto}://localhost:${port}/health`, { redirect: 'manual' })
        if (res.status === 200 || res.status === 307) { up = true; break }
      } catch { /* try next port */ }
    }
    if (!up) throw new Error()
  } catch {
    throw new Error(
      '\n\n❌ Backend is not running.\n' +
      'Start it with Mailpit SMTP:\n' +
      '  cd backend/src/Saha.API\n' +
      '  ASPNETCORE_ENVIRONMENT=IntegrationTest dotnet run\n',
    )
  }

  console.log('✅ Mailpit running at http://localhost:8025')
  console.log('✅ Backend running')
}
