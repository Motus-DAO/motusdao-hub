import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

const LEGAL_DIR = path.join(process.cwd(), 'docs/compliance/legal')

export function loadLegalMarkdown(filename: string): string {
  const filePath = path.join(LEGAL_DIR, filename)
  return fs.readFileSync(filePath, 'utf8')
}

export function renderLegalMarkdown(filename: string): string {
  const raw = loadLegalMarkdown(filename)
  return marked.parse(raw, { async: false }) as string
}
