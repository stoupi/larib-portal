import type { CorelabCalibrationAssignmentStatus, CorelabCalibrationStatus } from '@/app/generated/prisma'

export function nextCalibrationStatus(
  assignments: Array<{ status: CorelabCalibrationAssignmentStatus }>,
): CorelabCalibrationStatus {
  if (assignments.length === 0) return 'NOT_STARTED'
  if (assignments.every((assignment) => assignment.status === 'NOT_STARTED')) return 'NOT_STARTED'
  if (assignments.every((assignment) => assignment.status === 'SUBMITTED')) return 'AWAITING_REVIEW'
  return 'IN_PROGRESS'
}
