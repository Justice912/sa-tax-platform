const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taxOpsDesktop", {
  isDesktop: true,
  getAppMeta: () => ipcRenderer.invoke("taxops:get-app-meta"),
  openFile: (filePath) => ipcRenderer.invoke("taxops:open-file", filePath),
  printFile: (filePath) => ipcRenderer.invoke("taxops:print-file", filePath),
  saveFileAs: (filePath, suggestedName) =>
    ipcRenderer.invoke("taxops:save-file-as", filePath, suggestedName),
});
