import { inflateRawSync } from 'node:zlib'

type ZipEntry = { name: string; data: Buffer }

// Minimal reader: ExcelJS blocks the event loop for minutes on a CVI42 export,
// and only two rows of a handful of sheets are ever needed here.
function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>()
  const endIndex = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (endIndex < 0) throw new Error('NOT_A_ZIP')

  const entryCount = buffer.readUInt16LE(endIndex + 10)
  let offset = buffer.readUInt32LE(endIndex + 16)

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break
    const method = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength)

    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const raw = buffer.subarray(dataStart, dataStart + compressedSize)
    const entry: ZipEntry = { name, data: method === 0 ? raw : inflateRawSync(raw) }
    entries.set(entry.name, entry.data)

    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

function decodeXmlText(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function sharedStrings(entries: Map<string, Buffer>): string[] {
  const xml = entries.get('xl/sharedStrings.xml')?.toString('utf8')
  if (!xml) return []
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXmlText([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('')),
  )
}

export type Worksheet = { name: string; rows: Map<number, Map<string, string>> }

function columnOf(reference: string): string {
  return reference.replace(/\d+$/, '')
}

function parseSheet(xml: string, strings: string[], wantedRows: number[]): Map<number, Map<string, string>> {
  const rows = new Map<number, Map<string, string>>()
  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1])
    if (!wantedRows.includes(rowNumber)) continue
    const cells = new Map<string, string>()
    for (const cellMatch of rowMatch[2].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1]
      const reference = attributes.match(/r="([A-Z]+\d+)"/)?.[1]
      if (!reference) continue
      const type = attributes.match(/t="(\w+)"/)?.[1]
      const inline = cellMatch[2].match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/)?.[1]
      const value = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1]
      if (inline !== undefined) {
        cells.set(columnOf(reference), decodeXmlText(inline))
        continue
      }
      if (value === undefined) continue
      cells.set(columnOf(reference), type === 's' ? strings[Number(value)] ?? '' : decodeXmlText(value))
    }
    rows.set(rowNumber, cells)
  }
  return rows
}

export function readWorksheets(buffer: Buffer, wantedRows: number[]): Worksheet[] {
  const entries = readZipEntries(buffer)
  const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8')
  const relsXml = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8')
  if (!workbookXml || !relsXml) throw new Error('NOT_A_WORKBOOK')

  const targets = new Map<string, string>()
  for (const match of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    targets.set(match[1], match[2].replace(/^\/?(xl\/)?/, ''))
  }

  const strings = sharedStrings(entries)
  const sheets: Worksheet[] = []
  for (const match of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)) {
    const target = targets.get(match[2])
    const xml = target ? entries.get(`xl/${target}`)?.toString('utf8') : undefined
    if (!xml) continue
    sheets.push({ name: decodeXmlText(match[1]), rows: parseSheet(xml, strings, wantedRows) })
  }
  return sheets
}
