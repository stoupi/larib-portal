import type { CrfDefinition, DiscordanceThreshold, DocumentSlot } from '../schema'
import { cineSequence } from './cine'
import { t2wSequence } from './t2w'
import { t1MappingPreSequence } from './t1-mapping-pre'
import { t2MappingSequence } from './t2-mapping'
import { lgeSequence } from './lge'
import { t1MappingPostSequence } from './t1-mapping-post'

const sequences: CrfDefinition = [cineSequence, t2wSequence, t1MappingPreSequence, t2MappingSequence, lgeSequence, t1MappingPostSequence]

const discordanceThresholds: DiscordanceThreshold[] = [
  { fieldId: "lvef", minorPercent: 5, majorPercent: 10 },
  { fieldId: "lv_edv", minorPercent: 5, majorPercent: 10 },
  { fieldId: "lv_esv", minorPercent: 10, majorPercent: 20 },
  { fieldId: "lv_mass", minorPercent: 5, majorPercent: 10 },
  { fieldId: "rvef", minorPercent: 5, majorPercent: 10 },
  { fieldId: "rv_edv", minorPercent: 10, majorPercent: 20 },
  { fieldId: "tapse", minorPercent: 10, majorPercent: 20 },
]

const documentSlots: DocumentSlot[] = [
  {
    id: "excel_crf",
    label: "Excel CRF",
    accept: ".xlsx,.xls,.csv",
    required: true,
    description: "Upload the metrics Excel file to pre-fill sequences",
    onUpload: "import",
  },
]

export const MIR_DIJON_CRF_V1 = { sequences, discordanceThresholds, documentSlots }
