export function generateId(): string {
  return crypto.randomUUID();
}

export function nextBookId(books: { id: number }[]): number {
  return books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
}
