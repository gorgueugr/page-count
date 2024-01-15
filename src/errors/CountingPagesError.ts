export class CountingPagesError extends Error {
  constructor(message = "Could not read pages.") {
    super(message);
  }
}
