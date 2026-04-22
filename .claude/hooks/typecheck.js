#!/usr/bin/env node
const fs = require('fs')
const { execSync } = require('child_process')

const input = JSON.parse(fs.readFileSync(0, 'utf8'))
const filePath = input.tool_response?.filePath || input.tool_input?.file_path || ''

if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0)

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' })
} catch (e) {
  const output = (e.stdout?.toString() || '') + '\n' + (e.stderr?.toString() || '')
  const lines = output.trim().split('\n').slice(0, 15).join('\n')
  console.log(
    JSON.stringify({
      systemMessage: 'TypeScript errors detected:\n' + lines
    })
  )
}
