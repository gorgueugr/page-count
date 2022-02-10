export class CountingPagesException extends Error {
        constructor(message = "Could not read pages.") {
            super(message);
        }
      }