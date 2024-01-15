export class FileNotCompatibleError extends Error {
  constructor(message = "File not compatible.") {
    super(message);
  }
}
