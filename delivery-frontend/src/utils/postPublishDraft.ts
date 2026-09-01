let pendingFiles: File[] = [];

export function stagePostPublishFiles(files: File[]) {
  pendingFiles = [...files];
}

export function takePostPublishFiles() {
  const files = pendingFiles;
  pendingFiles = [];
  return files;
}
