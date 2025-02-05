export interface BookInfo {
  title: string;
  author: string;
}

export interface EpubProcessorOptions {
  sourcePath: string;
  verbose?: boolean;
  keepTempDir?: boolean;
}

export interface ProcessResult {
  epubPath: string;
  tempDir: string;
}
