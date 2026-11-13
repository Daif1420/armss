/**
 * ARMS - Archival Core Logic & Calculations Engine
 * Enforces the strict 1 Box = 6 Dossiers = 300 Projects mathematical model.
 */

import { Box, Dossier, Project, ProjectStatus, DossierStatus, BoxStatus } from '../types';

/**
 * Recalculates all project slots, dossier counts, and box status
 * based on imported projects mapping.
 */
export function buildBoxStructure(
  boxCode: string,
  firstJobId: number,
  importedProjectsMap: Map<number, { dateApproved: string | null; sourceUpload?: string; status?: ProjectStatus }>,
  existingBoxMeta?: Partial<Box>
): {
  box: Box;
  dossiers: Dossier[];
  projects: Project[];
} {
  const boxId = boxCode;
  const lastJobId = firstJobId + 299;

  // Find the highest imported Job ID in this box to determine proven gaps vs future pending
  let maxImportedJobIdInBox = -1;
  for (let j = firstJobId; j <= lastJobId; j++) {
    if (importedProjectsMap.has(j)) {
      if (j > maxImportedJobIdInBox) {
        maxImportedJobIdInBox = j;
      }
    }
  }

  const projects: Project[] = [];
  const dossiers: Dossier[] = [];
  let totalArchivedInBox = 0;
  let totalMissingInBox = 0;
  let totalPendingInBox = 0;
  let completedDossiersCount = 0;

  for (let d = 1; d <= 6; d++) {
    const fromJobId = firstJobId + (d - 1) * 50;
    const toJobId = fromJobId + 49;
    const dossierId = `${boxId}-${d}`;

    let dossierArchived = 0;
    let dossierMissing = 0;
    let dossierPending = 0;

    for (let slot = 0; slot < 50; slot++) {
      const jobId = fromJobId + slot;
      const importedData = importedProjectsMap.get(jobId);

      let status: ProjectStatus;
      let dateApproved: string | null = null;
      let sourceUpload = 'Reserved Slot';

      if (importedData) {
        status = importedData.status || 'Archived';
        dateApproved = importedData.dateApproved;
        sourceUpload = importedData.sourceUpload || 'Excel Import';
        if (status === 'Archived') dossierArchived++;
        else if (status === 'Missing') dossierMissing++;
        else dossierPending++;
      } else {
        // If not imported:
        // Proven gap rule: if any higher project has already been imported in this box,
        // it means this number was skipped and is MISSING!
        // If it's beyond the highest imported project, it is PENDING.
        if (jobId < maxImportedJobIdInBox) {
          status = 'Missing';
          dossierMissing++;
        } else {
          status = 'Pending';
          dossierPending++;
        }
      }

      projects.push({
        jobId,
        dateApproved,
        status,
        boxId,
        dossierNumber: d,
        slotIndex: slot,
        firstImportDate: importedData ? new Date().toISOString() : '',
        lastUpdateDate: new Date().toISOString(),
        sourceUpload,
        statusHistory: [
          {
            status,
            timestamp: new Date().toISOString(),
            note: importedData ? 'Imported from Excel delivery' : 'Auto-calculated sequence slot',
          },
        ],
      });
    }

    // Determine Dossier status
    let dossierStatus: DossierStatus = 'Pending';
    if (dossierArchived === 50) {
      dossierStatus = 'Archived';
      completedDossiersCount++;
    } else if (dossierArchived > 0) {
      dossierStatus = 'Inprogress';
    }

    dossiers.push({
      id: dossierId,
      boxId,
      dossierNumber: d,
      fromJobId,
      toJobId,
      totalProjects: 50,
      archivedCount: dossierArchived,
      missingCount: dossierMissing,
      pendingCount: dossierPending,
      status: dossierStatus,
    });

    totalArchivedInBox += dossierArchived;
    totalMissingInBox += dossierMissing;
    totalPendingInBox += dossierPending;
  }

  const boxStatus: BoxStatus = totalArchivedInBox === 300 ? 'Archived' : 'Inprogress';

  const box: Box = {
    id: boxId,
    boxCode,
    firstJobId,
    lastJobId,
    totalDossiers: 6,
    completedDossiers: completedDossiersCount,
    totalProjects: 300,
    archivedProjects: totalArchivedInBox,
    missingProjects: totalMissingInBox,
    pendingProjects: totalPendingInBox,
    status: boxStatus,
    isForceClosed: existingBoxMeta?.isForceClosed || false,
    forceCloseReason: existingBoxMeta?.forceCloseReason,
    forceClosedBy: existingBoxMeta?.forceClosedBy,
    forceClosedAt: existingBoxMeta?.forceClosedAt,
    createdAt: existingBoxMeta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { box, dossiers, projects };
}
