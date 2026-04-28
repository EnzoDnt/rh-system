import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(here, '../../../.env')

try {
  const content = readFileSync(envPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Treat empty shell vars as missing so a stray `ANTHROPIC_API_KEY=` in
    // the user's shell doesn't shadow the value defined in .env.
    if (!process.env[key]) process.env[key] = value
  }
} catch (err) {
  console.warn(`[dev] could not read ${envPath}: ${err.message}`)
}

const child = spawn('tsx', ['watch', 'src/index.ts'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig))
}
