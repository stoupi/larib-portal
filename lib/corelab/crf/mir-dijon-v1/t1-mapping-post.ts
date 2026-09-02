import type { SequenceDefinition } from '../schema'

export const t1MappingPostSequence: SequenceDefinition = {
  id: "t1-mapping-post",
  name: "T1 Mapping Post",
  sections: [
    {
      id: "t1-post-availability",
      name: "Availability",
      fields: [
        { id: "t1_post_available", name: "T1 Post Available", type: "boolean", required: true },
      ],
    },
  ],
}
