// Polyfill ReadableStream async iterator (Safari/WebKit < 18.4, ChatGPT Atlas)
// pdfjs-dist v5 fait `for await (const value of readableStream)` dans getTextContent,
// ce qui jette « undefined is not a function (near '...value of readableStream...') »
// sur les navigateurs qui n'implémentent pas Symbol.asyncIterator sur ReadableStream.
if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    return {
      next() {
        return reader.read();
      },
      return(value) {
        reader.releaseLock();
        return Promise.resolve({ value, done: true });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
}
