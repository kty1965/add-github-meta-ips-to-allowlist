class TaskScheduler {
  constructor() {
    this._limiter = new Bottleneck({
      minTime: 150,
      maxConcurrent: 10,
    });
  }

  get limiter() {
    return this._limiter;
  }

  schedule(task) {
    return this._limiter.schedule(task);
  }
}

export default new TaskScheduler();
