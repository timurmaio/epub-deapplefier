export abstract class BaseProcessor {
  constructor(protected tempDir: string) {
    if (!tempDir) {
      throw new Error('tempDir is required');
    }
  }

  protected updateTempDir(newTempDir: string) {
    this.tempDir = newTempDir;
  }
}
