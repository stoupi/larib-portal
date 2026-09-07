import type { ValueSetCatalogueEntry } from '../library-extract'

export const MIR_DIJON_VALUE_SETS: ValueSetCatalogueEntry[] = [
  {
    code: 'cine_views',
    name: 'Cine views',
    description: 'Cine acquisition planes available for the exam',
    options: ['SAX', '2CH', '3CH', '4CH'],
  },
  {
    code: 'artefacts_grade_0_4',
    name: 'Artefacts grade (0–4)',
    description: 'Severity of the artefacts on the sequence, 0 none to 4 non analysable',
    options: ['0', '1', '2', '3', '4'],
  },
  {
    code: 'artefacts_type_cine',
    name: 'Artefacts type — cine and T2w',
    description: 'Artefact families observed on bright-blood sequences',
    options: ['Ghosting (motion)', 'Wrapping', 'Flow', 'Metal', 'Arrhythmia'],
  },
  {
    code: 'artefacts_type_lge',
    name: 'Artefacts type — LGE',
    description: 'Artefact families observed on late gadolinium enhancement',
    options: ['Ghosting (motion)', 'Wrapping', 'Flow', 'Metal', 'Arrhythmia', 'Imperfect Ti selection'],
  },
  {
    code: 'artefacts_type_mapping',
    name: 'Artefacts type — mapping',
    description: 'Artefact families observed on T1 and T2 mapping',
    options: ['Bad MOCO', 'Wrapping', 'Other'],
  },
  {
    code: 'wall_motion_grade',
    name: 'Wall motion grade',
    description: 'Segmental wall motion grading on cine',
    options: ['Normal', 'Hypokinetic', 'Akinetic', 'Dyskinetic'],
    colours: {
      Normal: '#ECFDF5',
      Hypokinetic: '#FEFCE8',
      Akinetic: '#FEF2F2',
      Dyskinetic: '#FEE2E2',
    },
  },
  {
    code: 'pericardial_effusion_grade',
    name: 'Pericardial effusion thickness (0–3)',
    description: 'Thickness of the pericardial effusion, 0 none to 3 large',
    options: ['0', '1', '2', '3'],
  },
  {
    code: 'segment_yes_no',
    name: 'Segment yes / no',
    description: 'Presence of the finding on a myocardial segment',
    options: ['Y', 'N'],
    colours: { Y: '#FEF2F2', N: '#F8FAFC' },
  },
  {
    code: 'pericardial_involvement',
    name: 'Pericardial involvement',
    description: 'None, localised or diffuse pericardial involvement',
    options: ['N', 'L', 'D'],
  },
  {
    code: 'lge_sequence_type',
    name: 'LGE sequence type',
    description: 'Acquisition used for late gadolinium enhancement',
    options: ['FLASH', 'PSIR-PSIR', 'PSIR-MAG'],
  },
  {
    code: 'lge_pattern',
    name: 'LGE pattern',
    description: 'Distribution of late gadolinium enhancement on a myocardial segment',
    options: ['Sub-epicardial', 'Intra-myocardial', 'Sub-endocardial', 'Transmural (epi)', 'Transmural (endo)', 'Mixed', 'None'],
    colours: {
      'Sub-epicardial': '#FCE7F3',
      'Intra-myocardial': '#EDE9FE',
      'Sub-endocardial': '#FEF3C7',
      'Transmural (epi)': '#FECACA',
      'Transmural (endo)': '#FCA5A5',
      Mixed: '#E5E7EB',
      None: '#F8FAFC',
    },
  },
]
