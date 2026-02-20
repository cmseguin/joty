export enum Status {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done'
}

export interface Item {
  id: string
  title: string
  body?: string
  status: Status
}

export interface State {
  items: Item[]
}