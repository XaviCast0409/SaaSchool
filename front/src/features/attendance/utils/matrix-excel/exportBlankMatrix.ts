import { MarkedMatrixExportParams } from './types';
import { exportWellMarkedMatrixExcel } from './exportColoredMatrix';

export const exportBlankMatrixExcel = async (
  params: MarkedMatrixExportParams & { includeStudentNames?: boolean },
): Promise<void> => {
  await exportWellMarkedMatrixExcel({
    ...params,
    mode: params.includeStudentNames ? 'WITH_ATTENDANCE' : 'EMPTY',
  });
};
