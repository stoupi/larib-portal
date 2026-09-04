import ExcelJS from 'exceljs'
import path from 'node:path'
import { MIR_DIJON_CVI42_MAPPINGS, FIRST_VALUE_ROW, HEADER_ROW } from '../../lib/corelab/import/mapping'

const VALUES: Record<string, string | number> = {
  'CINE!F': '1', 'CINE!G': 'Ghosting (motion)', 'CINE!I': 'No', 'CINE!AA': 'No', 'CINE!AB': 'No',
  'CINE!AC': 50, 'CINE!AD': 'Yes', 'CINE!AE': 52, 'CINE!AF': 172, 'CINE!AG': 82, 'CINE!AH': 124,
  'CINE!AI': 11, 'CINE!AJ': 'No', 'CINE!AK': 'No', 'CINE!AL': 21, 'CINE!AM': 'No',
  'CINE!AQ': 'No', 'CINE!AT': 'No', 'CINE!AW': '0',
  'T2w!B': 'No', 'T1_mapping_pre!B': 'No', 'T2 mapping!B': 'No', 'LGE!B': 'No', 'T1_mapping_post!B': 'No',
}

async function main() {
  const workbook = new ExcelJS.Workbook()
  const sheetKeys = [...new Set(MIR_DIJON_CVI42_MAPPINGS.map((entry) => entry.sheetKey))]

  for (const examIndex of [1, 2]) {
    for (const sheetKey of sheetKeys) {
      const name = examIndex === 1 ? `b_${sheetKey}` : `f_${sheetKey}_FU${examIndex - 1}_exam`
      const sheet = workbook.addWorksheet(name)
      for (const entry of MIR_DIJON_CVI42_MAPPINGS.filter((candidate) => candidate.sheetKey === sheetKey)) {
        sheet.getCell(`${entry.column}${HEADER_ROW}`).value = entry.columnHeader
        const value = VALUES[`${sheetKey}!${entry.column}`]
        if (value !== undefined) sheet.getCell(`${entry.column}${FIRST_VALUE_ROW}`).value = value
      }
    }
  }
  const target = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'corelab', 'cvi42-filled.xlsx')
  await workbook.xlsx.writeFile(target)
  console.log(`wrote ${target}`)
}

main()
