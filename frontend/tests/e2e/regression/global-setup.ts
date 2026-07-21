/**
 * Confirms the Saha backend is reachable before the regression suite runs.
 * Vite is started by the webServer block in playwright.regression.config.ts.
 */
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0' // trust the local self-signed dev cert

import { API_BASE } from './_fixtures'

export default async function globalSetup() {
  const health = API_BASE.replace('/api/v1', '/health')
  try {
    const res = await fetch(health)
    if (!res.ok) throw new Error(`status ${res.status}`)
  } catch (err) {
    throw new Error(
      '\n\n❌ Saha backend is not reachable at ' + health + ' (' + String(err) + ').\n\n' +
        'Start it in the IntegrationTest environment first:\n\n' +
        '  cd backend/src/Saha.API\n' +
        '  ASPNETCORE_ENVIRONMENT=IntegrationTest \\\n' +
        '  ASPNETCORE_URLS="https://localhost:7001;http://localhost:5001" \\\n' +
        '  dotnet run --no-launch-profile\n',
    )
  }
  console.log('✅ Backend reachable at ' + health)
}
