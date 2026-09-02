import type { SequenceDefinition } from '../schema'

export const t2wSequence: SequenceDefinition = {
  id: "t2w",
  name: "T2w",
  sections: [
    {
      id: "t2w-availability",
      name: "Availability & Artefacts",
      fields: [
        { id: "t2w_available", name: "T2w Available", type: "boolean", required: true },
        {
          id: "artefacts_grade",
          name: "Artefacts Grade",
          type: "categorical",
          required: true,
          options: ["0", "1", "2", "3", "4"],
          conditionalOn: { fieldId: "t2w_available", value: true },
        },
        {
          id: "artefacts_type",
          name: "Artefacts Type",
          type: "categorical",
          required: false,
          options: ["Ghosting (motion)", "Wrapping", "Flow", "Metal", "Arrhythmia"],
          conditionalOn: { fieldId: "t2w_available", value: true },
        },
      ],
    },
    {
      id: "t2w-hyperintensity",
      name: "T2w Myocardial Hyperintensity",
      fields: [
        {
          id: "myocardial_hyperintensity",
          name: "Myocardial Hyperintensity",
          type: "boolean",
          required: true,
          conditionalOn: { fieldId: "t2w_available", value: true },
        },
        {
          id: "hyperintensity_segments",
          name: "Hyperintensity Segments",
          type: "segment_categorical",
          required: true,
          segmentCount: 17,
          options: ["Y", "N"],
          conditionalOn: { fieldId: "myocardial_hyperintensity", value: true },
        },
      ],
    },
    {
      id: "t2w-pericardial",
      name: "Pericardial",
      fields: [
        {
          id: "t2w_pericardial_hyperintensity",
          name: "Pericardial Hyperintensity",
          type: "categorical",
          required: true,
          options: ["N", "L", "D"],
          conditionalOn: { fieldId: "t2w_available", value: true },
        },
      ],
    },
  ],
}
