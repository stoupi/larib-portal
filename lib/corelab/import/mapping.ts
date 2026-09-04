export type ImportMapping = {
  sheetKey: string
  column: string
  columnHeader: string
  sequenceId: string
  fieldId: string
}

const SHEET_KEYS: Record<string, string> = {
  cine: 'CINE',
  t2w: 'T2w',
  't1-mapping-pre': 'T1_mapping_pre',
  't2-mapping': 'T2 mapping',
  lge: 'LGE',
  't1-mapping-post': 'T1_mapping_post',
}

export const HEADER_ROW = 3
export const FIRST_VALUE_ROW = 4

export function sheetKeyForSequence(sequenceId: string): string | null {
  return SHEET_KEYS[sequenceId] ?? null
}

// Follow-up sheets sometimes spell the key with a space, sometimes with an underscore.
export function sheetForExam(examIndex: number, sheetKey: string): RegExp {
  const escaped = sheetKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ _]/g, '[ _]')
  if (examIndex <= 1) return new RegExp(`^b_${escaped}$`, 'i')
  return new RegExp(`^f_${escaped}_FU${examIndex - 1}_exam$`, 'i')
}

function mapping(sequenceId: string, column: string, columnHeader: string, fieldId: string): ImportMapping {
  return { sheetKey: SHEET_KEYS[sequenceId], column, columnHeader, sequenceId, fieldId }
}

export const MIR_DIJON_CVI42_MAPPINGS: ImportMapping[] = [
  mapping('cine', 'F', 'Grade', 'artefacts_grade'),
  mapping('cine', 'G', 'Type', 'artefacts_type'),
  mapping('cine', 'I', 'Wall motion abnormalities', 'wall_motion_abnormalities'),
  mapping('cine', 'AA', 'Global', 'wall_motion_global'),
  mapping('cine', 'AB', 'Asynchronism', 'asynchronism'),
  mapping('cine', 'AC', 'Visual LVEF (%)', 'visual_lvef'),
  mapping('cine', 'AD', 'Measurable', 'lv_measurable'),
  mapping('cine', 'AE', 'LVEF (%)', 'lvef'),
  mapping('cine', 'AF', 'LV EDV (mL)', 'lv_edv'),
  mapping('cine', 'AG', 'LV ESV (mL)', 'lv_esv'),
  mapping('cine', 'AH', 'LV mass (g)', 'lv_mass'),
  mapping('cine', 'AI', 'ED max thickness (mm)', 'ed_max_thickness'),
  mapping('cine', 'AJ', 'Wall motion abnormalities', 'rv_wall_motion'),
  mapping('cine', 'AK', 'Visual RV systolic dysfunction', 'rv_visual_dysfunction'),
  mapping('cine', 'AL', 'TAPSE', 'tapse'),
  mapping('cine', 'AM', 'Measurable', 'rv_measurable'),
  mapping('cine', 'AN', 'RVEF (%)', 'rvef'),
  mapping('cine', 'AO', 'RV EDV (mL)', 'rv_edv'),
  mapping('cine', 'AP', 'RV ESV (mL)', 'rv_esv'),
  mapping('cine', 'AQ', 'Measurable', 'la_measurable'),
  mapping('cine', 'AR', 'Biplanar smallest volume (mL)', 'la_biplanar_smallest'),
  mapping('cine', 'AS', 'Biplanar largest volume (mL)', 'la_biplanar_largest'),
  mapping('cine', 'AT', 'Measurable', 'ra_measurable'),
  mapping('cine', 'AU', '4C Smallest surface (cm²)', 'ra_4c_smallest'),
  mapping('cine', 'AV', '4C Largest surface (cm²)', 'ra_4c_largest'),
  mapping('cine', 'AW', 'Pericardial effusion', 'pericardial_effusion'),

  mapping('t2w', 'B', 'T2w available', 't2w_available'),
  mapping('t2w', 'C', 'Grade', 'artefacts_grade'),
  mapping('t2w', 'D', 'Type', 'artefacts_type'),
  mapping('t2w', 'E', 'Myocardial hyperintensity', 'myocardial_hyperintensity'),

  mapping('t1-mapping-pre', 'B', 'T1 mapping pré- available', 't1_pre_available'),
  mapping('t1-mapping-pre', 'C', 'Basal slice available', 'basal_available'),
  mapping('t1-mapping-pre', 'D', 'Medial slice available', 'medial_available'),
  mapping('t1-mapping-pre', 'E', 'Apical slice available', 'apical_available'),
  mapping('t1-mapping-pre', 'F', 'Grade', 'artefacts_grade'),
  mapping('t1-mapping-pre', 'G', 'Type', 'artefacts_type'),
  mapping('t1-mapping-pre', 'H', 'Mid IVS (ms)', 'mid_ivs'),
  mapping('t1-mapping-pre', 'I', 'Presence of local elevation', 'presence_local_elevation'),
  mapping('t1-mapping-pre', 'J', 'Local elevation (ms)', 'local_elevation'),

  mapping('t2-mapping', 'B', 'T2 mapping available', 't2_available'),
  mapping('t2-mapping', 'C', 'Basal slice available', 'basal_available'),
  mapping('t2-mapping', 'D', 'Medial slice available', 'medial_available'),
  mapping('t2-mapping', 'E', 'Apical slice available', 'apical_available'),
  mapping('t2-mapping', 'F', 'Grade', 'artefacts_grade'),
  mapping('t2-mapping', 'G', 'Type', 'artefacts_type'),
  mapping('t2-mapping', 'H', 'Mid IVS (ms)', 'mid_ivs'),
  mapping('t2-mapping', 'I', 'Presence of local elevation', 'presence_local_elevation'),
  mapping('t2-mapping', 'J', 'Local elevation (ms)', 'local_elevation'),

  mapping('lge', 'B', 'LGE available', 'lge_available'),
  mapping('lge', 'C', 'Sequence used', 'sequence_used'),
  mapping('lge', 'D', 'Grade', 'artefacts_grade'),
  mapping('lge', 'E', 'Type', 'artefacts_type'),
  mapping('lge', 'F', '17 segments analysable', 'segments_analysable'),
  mapping('lge', 'G', 'LGE Presence', 'lge_presence'),
  mapping('lge', 'Y', 'Visual quantification', 'visual_quantification'),
  mapping('lge', 'Z', 'LGE mass (g)', 'lge_mass'),
  mapping('lge', 'AA', 'Percentage of LV mass (%)', 'lge_percentage'),

  mapping('t1-mapping-post', 'B', 'T1 mapping post- available', 't1_post_available'),
]
