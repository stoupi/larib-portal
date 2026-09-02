import { useTranslations } from 'next-intl'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CrfDefinition, FieldDefinition } from '@/lib/corelab/crf/schema'

function toleranceLabel(field: FieldDefinition, none: string): string {
  if (!field.calibrationTolerance) return none
  const { absolute, relativePercent } = field.calibrationTolerance
  return `±${absolute}${field.unit ? ` ${field.unit}` : ''} · ${relativePercent} %`
}

export function CrfReadonly({ definition }: { definition: CrfDefinition }) {
  const t = useTranslations('corelab.config')

  return (
    <Accordion type="multiple" className="w-full">
      {definition.map((sequence) => {
        const variables = sequence.sections.reduce((total, section) => total + section.fields.length, 0)
        return (
          <AccordionItem key={sequence.id} value={sequence.id}>
            <AccordionTrigger>
              <span className="flex flex-col items-start text-left">
                <span className="font-semibold text-text-primary">{sequence.name}</span>
                <span className="text-xs font-normal text-text-secondary">
                  {t('sectionsAndVariables', { sections: sequence.sections.length, variables })}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('variable')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('unit')}</TableHead>
                      <TableHead>{t('entry')}</TableHead>
                      <TableHead>{t('tolerance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sequence.sections.flatMap((section) =>
                      section.fields.map((field) => (
                        <TableRow key={`${section.id}-${field.id}`}>
                          <TableCell className="font-medium text-text-primary">{field.name}</TableCell>
                          <TableCell className="text-text-secondary">{field.type}</TableCell>
                          <TableCell className="text-text-secondary">{field.unit ?? '—'}</TableCell>
                          <TableCell className="text-text-secondary">{field.required ? t('required') : t('optional')}</TableCell>
                          <TableCell className="text-text-secondary">{toleranceLabel(field, t('noTolerance'))}</TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
