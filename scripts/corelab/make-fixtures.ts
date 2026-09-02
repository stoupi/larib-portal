import ExcelJS from 'exceljs'
import path from 'node:path'

const ROWS = [
  ['P-101', 'CHU-DIJ-1', 'CMR', new Date('2026-05-01T00:00:00.000Z'), 1, 'Baseline'],
  ['P-101', 'CHU-DIJ-1', 'CMR', new Date('2026-11-01T00:00:00.000Z'), 2, 'FU1'],
  ['P-102', 'CHU-DIJ-1', 'CMR', new Date('2026-05-04T00:00:00.000Z'), 1, 'Baseline'],
  ['P-103', 'CHU-NEW', 'CMR', new Date('2026-06-01T00:00:00.000Z'), 1, 'Baseline'],
  ['P-104', 'CHU-DIJ-1', 'CMR', new Date('2026-05-02T00:00:00.000Z'), 1, 'Baseline'],
  ['P-104', 'CHU-DIJ-1', 'CMR', new Date('2026-05-02T00:00:00.000Z'), 1, 'Baseline'],
  ['P-105', 'CHU-DIJ-1', 'PET', new Date('2026-05-03T00:00:00.000Z'), 9, 'Baseline'],
]

async function main() {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('cohort')
  sheet.addRow(['patient_id', 'centre', 'modality', 'exam_date', 'exam_index', 'time_label'])
  for (const row of ROWS) sheet.addRow(row)
  const target = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'corelab', 'cohort-mixed.xlsx')
  await workbook.xlsx.writeFile(target)
  console.log(`wrote ${target}`)
}

main()
