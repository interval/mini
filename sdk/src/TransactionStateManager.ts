import {
  TransactionStateValue,
  type TransactionState,
} from "./transactionStateSchema";

export class TransactionStateManager {
  private internalState: TransactionState;

  private subscribers = new Set<(value: TransactionState) => void>();

  subscribe(fn: (value: TransactionState) => void) {
    this.subscribers.add(fn);
    return {
      unsubscribe: () => {
        this.subscribers.delete(fn);
      },
    };
  }

  getState() {
    return this.internalState;
  }

  setState(state: TransactionStateValue) {
    this.internalState = {
      value: state,
      id: this.internalState.id + 1,
    };
    for (const fn of this.subscribers) {
      fn(this.internalState);
    }
  }

  patchState<K extends keyof TransactionStateValue>(
    key: K,
    value: TransactionStateValue[K]
  ) {
    const newValue = {
      ...this.internalState.value,
      [key]: value,
    };
    this.setState(newValue);
  }

  constructor(initialState: TransactionStateValue) {
    this.internalState = {
      value: initialState,
      id: 0,
    };
  }
}
