import type { State } from "../model"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

interface UpdatePayload {
  id: string
  title?: string
  body?: string
  status?: string
}
export const update = async ({ id, status, title, body }: UpdatePayload) => {
  const requestBody: Omit<UpdatePayload, 'id'> = {}

  if (typeof status !== 'undefined') {
    requestBody.status = status
  }

  if (typeof title !== 'undefined') {
    requestBody.title = title
  }

  if (typeof body !== 'undefined') {
    requestBody.body = body
  }

  const res = await fetch(`${BASE_URL}/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })
  const data = await res.json() as Promise<State>
  return data;
}

interface CreatePayload {
  title?: string
  body?: string
  status?: string
}
export const create = async ({ status, title, body }: CreatePayload) => {
  const requestBody: Omit<CreatePayload, 'id'> = {}

  if (typeof status !== 'undefined') {
    requestBody.status = status
  }

  if (typeof title !== 'undefined') {
    requestBody.title = title
  }

  if (typeof body !== 'undefined') {
    requestBody.body = body
  }

  const res = await fetch(`${BASE_URL}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })
  const data = await res.json() as Promise<State>
  return data;
}

interface DeletePayload {
  id: string
}
export const remove = async ({ id }: DeletePayload) => {
  const res = await fetch(`${BASE_URL}/api/items/${id}`, {
    method: 'DELETE',
  })
  const data = await res.json() as Promise<State>
  return data;
}

export const get = async () => {
  const res = await fetch(`${BASE_URL}/api/items`)
  const data = await res.json() as Promise<State>
  return data;
}