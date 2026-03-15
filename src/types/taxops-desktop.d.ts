export {};

declare global {
  interface Window {
    taxOpsDesktop?: {
      isDesktop: boolean;
      getAppMeta: () => Promise<{ name: string; version: string; platform: string }>;
      openFile: (filePath: string) => Promise<{ filePath: string }>;
      printFile: (filePath: string) => Promise<{ filePath: string }>;
      saveFileAs: (
        filePath: string,
        suggestedName?: string,
      ) => Promise<{ cancelled: boolean; filePath: string }>;
    };
  }
}
