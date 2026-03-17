/**
 * Preparação para backup em cloud (Google Drive).
 * Será usado Google Drive API ou serviço externo (ex.: rclone) no futuro.
 * Apenas assinaturas; sem implementação real.
 */

/**
 * Faz upload do backup para o Google Drive.
 */
export async function uploadBackupToGoogleDrive(_filePath: string, _version: string): Promise<void> {
  // TODO: Google Drive API
  throw new Error("Not implemented yet: upload backup file to Google Drive");
}

/**
 * Lista backups guardados na cloud.
 */
export async function listCloudBackups(): Promise<string[]> {
  return [];
}

/**
 * Restaura um backup a partir da cloud.
 */
export async function restoreCloudBackup(_version: string): Promise<void> {
  // TODO: Download e extrair
  throw new Error("Not implemented yet: download and restore cloud backup version");
}
