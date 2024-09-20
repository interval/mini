import { Failure } from "./Failure";
import { Transaction } from "./Transaction";

export type Action = {
  handler: () => Promise<any>;
};

export class TransactionManager {
  #nextId = 0;

  #transactions: Record<number, Transaction> = {};

  getTransaction(id: number) {
    if (!(id in this.#transactions)) {
      return new Failure(`Transaction ${id} not found`);
    }
    return this.#transactions[id];
  }

  invoke(slug: string) {
    const action = this.actions[slug];
    if (!action) {
      return new Failure(`Action ${slug} not found`);
    }

    const id = this.#nextId++;

    this.#transactions[id] = new Transaction(action.handler);

    return { id };
  }

  constructor(public actions: Record<string, Action>) {}
}
