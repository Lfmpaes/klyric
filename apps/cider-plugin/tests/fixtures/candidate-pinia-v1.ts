type Subscriber = () => void;

export function createCandidatePiniaFixture() {
  const subscribers = new Set<Subscriber>();
  const store = {
    lines: [
      { text: "First sanitized line", startTime: 1.5 },
      { text: "Second sanitized line", startTime: 3 },
      { text: "Third sanitized line", startTime: 5.25 },
    ],
    activeIndex: 1,
    positionMs: 3_400,
    trackId: "sanitized-track-id",
    $subscribe(callback: Subscriber) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };

  return {
    root: { __PLUGINSYS__: { stores: { lyrics: store } } },
    store,
    notify() {
      for (const subscriber of subscribers) subscriber();
    },
    subscriberCount() {
      return subscribers.size;
    },
  };
}
