import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const websiteFiles = new Set([
  'frontend/public/staticwebapp.config.json',
  'frontend/scripts/arrivo-deploy-scope.mjs',
  'frontend/tests/arrivo-site.test.js',
  'frontend/tests/e2e/arrivo.spec.ts',
  '.github/workflows/arrivo-site.yml',
])

function isWebsiteFile(path) {
  return path.startsWith('frontend/public/arrivo/') || websiteFiles.has(path)
}

export function shouldDeployArrivo(paths) {
  const changesApp = paths.some(
    (path) =>
      path.startsWith('backend/') ||
      path.startsWith('infrastructure/') ||
      (path.startsWith('frontend/') && !isWebsiteFile(path)),
  )
  return paths.some(isWebsiteFile) && !changesApp
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const paths = readFileSync(0, 'utf8').split('\0').filter(Boolean)
  console.log(`deploy=${shouldDeployArrivo(paths)}`)
}
