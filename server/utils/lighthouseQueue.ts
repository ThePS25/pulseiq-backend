class LighthouseQueue {
  private chain: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(() => fn());
    this.chain = result.catch(() => undefined);
    return result;
  }
}

export const lighthouseQueue = new LighthouseQueue();
