import type { State, Item } from './model'
import { Status } from './model'
import yaml from 'js-yaml'
import { LexoRank } from "lexorank";

const PORT = Number(process.env.PORT || 3000)
const DIST_DIR = `${process.cwd()}/dist`

/**
* Generate a UUID v4 style string using Bun's built-in `crypto`.
*/
function generateUUID(): string {
	return crypto.randomUUID()
}

function sendJSON(response: Response, status: number, data: unknown): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Access-Control-Allow-Origin': '*'
		}
	})
}

function sendText(status: number, text: string, contentType = 'text/plain; charset=utf-8'): Response {
	return new Response(text, {
		status,
		headers: { 'Content-Type': contentType }
	})
}

function mimeType(file: string) {
	const ext = file.split('.').pop()?.toLowerCase()
	switch (ext) {
		case 'html': return 'text/html; charset=utf-8'
		case 'js': return 'application/javascript; charset=utf-8'
		case 'css': return 'text/css; charset=utf-8'
		case 'json': return 'application/json; charset=utf-8'
		case 'png': return 'image/png'
		case 'jpg':
		case 'jpeg': return 'image/jpeg'
		case 'svg': return 'image/svg+xml'
		case 'ico': return 'image/x-icon'
		case 'map': return 'application/octet-stream'
		default: return 'application/octet-stream'
	}
}

function saveState(s: State) {
	const yamlStr = "---\n" + s
  .map(doc => yaml.dump(doc))
  .join("---\n");
	Bun.write('.joty', yamlStr)
}

async function loadState(): Promise<State> {
	let tmpState: State = []
	try {
		const file = Bun.file('.joty')
		if (await file.exists()) {
			const data = await file.text()
			const parsed = yaml.loadAll(data) as unknown
			if (parsed && typeof parsed === 'object' && Array.isArray(parsed)) {
				tmpState = parsed
			}
		}
	} catch {
		console.error('Could not load state, starting with empty state.')
	}
	return tmpState
}

function getOrderedState(state: State): State {
	return [...state].sort((a, b) => {
		const rankResult = a.order.localeCompare(b.order);
		if (rankResult !== 0) return rankResult;
		return a.id.localeCompare(b.id);
	})
}

async function serveStatic(pathname: string): Promise<Response> {
	// Prevent directory traversal
	const safePath = pathname.replace(/^\./, '')
	let filePath = `${DIST_DIR}${safePath}`
	
	try {
		const file = Bun.file(filePath)
		if (!(await file.exists())) {
			// Check if it's a directory and serve index.html
			const indexFile = Bun.file(`${filePath}/index.html`)
			if (await indexFile.exists()) {
				filePath = `${filePath}/index.html`
			} else {
				// Fall back to index.html for SPA routing
				filePath = `${DIST_DIR}/index.html`
			}
		}
	} catch {
		filePath = `${DIST_DIR}/index.html`
	}
	
	// Ensure file is under DIST_DIR
	if (!filePath.startsWith(DIST_DIR)) {
		return sendText(403, 'Forbidden')
	}
	
	try {
		const file = Bun.file(filePath)
		if (await file.exists()) {
			const type = mimeType(filePath)
			return new Response(file, {
				headers: { 'Content-Type': type }
			})
		} else {
			return sendText(404, 'Not Found')
		}
	} catch {
		return sendText(500, 'Server error')
	}
}

Bun.serve({
	port: PORT,
	async fetch(req) {
		try {
			// Basic CORS preflight handling
			if (req.method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					}
				})
			}
			
			const url = new URL(req.url)
			const pathname = url.pathname
			let state = await loadState()
			
			// API: /api/items and /api/items/:id
			if (pathname.startsWith('/api/items')) {
				const parts = pathname.split('/').filter(Boolean) // ['api','items', ...]
				if (parts.length === 2) {
					// collection
					if (req.method === 'GET') {
						state = await loadState()
						return sendJSON(new Response(), 200, getOrderedState(state))
					}
					
					if (req.method === 'POST') {
						state = await loadState()
						let requestBody: Record<string, unknown> = {}
						
						try { 
							requestBody = await req.json() as Record<string, unknown>
						} catch { 
							return sendJSON(new Response(), 400, { error: 'invalid JSON' })
						}
						
						if (
							'title' in requestBody === false || 
							typeof requestBody.title !== 'string'
						) {
							return sendJSON(new Response(), 400, { error: 'missing or incorrect title' })
						}
						
						if (
							typeof requestBody.body !== 'undefined' && 
							typeof requestBody.body !== 'string'
						) {
							return sendJSON(new Response(), 400, { error: 'incorrect body' })
						}

						const orderedState = getOrderedState(state)
						const lexoRankOrder = state.length === 0 ? LexoRank.middle() : LexoRank.parse(orderedState[orderedState.length - 1].order).genNext()
						
						const item: Item = { 
							id: generateUUID(), 
							title: requestBody.title, 
							body: requestBody.body, 
							status: Status.TODO,
							order: lexoRankOrder.toString()
						}
						
						state.push(item)
						saveState(state)
						return sendJSON(new Response(), 201, getOrderedState(state))
					}
				} else if (parts.length === 3) {
					const id = parts[2]
					if (!id) { 
						return sendJSON(new Response(), 400, { error: 'invalid id' })
					}
					
					state = await loadState()
					const existing = state.find((t) => t.id === id)
					
					if (req.method === 'GET') {
						if (!existing) { 
							return sendJSON(new Response(), 404, { error: 'not found' })
						}
						return sendJSON(new Response(), 200, existing)
					}
					
					if (req.method === 'PATCH') {
						if (!existing) { 
							return sendJSON(new Response(), 404, { error: 'not found' })
						}
						
						let requestBody: Record<string, unknown> = {}
						
						try { 
							requestBody = await req.json() as Record<string, unknown>
						} catch { 
							return sendJSON(new Response(), 400, { error: 'invalid JSON' })
						}
						
						if (
							typeof requestBody.title !== 'undefined' &&  
							typeof requestBody.title !== 'string'
						) {
							return sendJSON(new Response(), 400, { error: 'incorrect title' })
						}
						
						if (
							typeof requestBody.body !== 'undefined' && 
							typeof requestBody.body !== 'string'
						) {
							return sendJSON(new Response(), 400, { error: 'incorrect body' })
						}
						
						if (typeof requestBody.status !== 'undefined') {
							if (
								typeof requestBody.status !== 'string' ||
								![Status.TODO, Status.IN_PROGRESS, Status.DONE].includes(requestBody.status as Status)
							) {
								return sendJSON(new Response(), 400, { error: 'incorrect status' })
							}
							
							existing.status = requestBody.status as Status
						}
						
						const updated: Item = { 
							...existing, 
							title: requestBody.title ?? existing.title, 
							body: requestBody.body ?? existing.body, 
						}

						// Change order if requested
						if (typeof requestBody.order !== 'undefined') {
							if (typeof requestBody.order !== 'string' || !requestBody.order.includes('-')) {
								return sendJSON(new Response(), 400, { error: 'incorrect order' })
							}
							
							const [before, after] = requestBody.order.split('-')
							if (before && after) {
								updated.order = LexoRank.parse(before).between(LexoRank.parse(after)).toString()
							} else if (before) {
								updated.order = LexoRank.parse(before).genNext().toString()
							} else if (after) {
								updated.order = LexoRank.parse(after).genPrev().toString()
							}
						}
						
						const idx = state.findIndex((t) => t.id === id)
						if (idx >= 0) state[idx] = updated
						
						saveState(state)
						return sendJSON(new Response(), 200, getOrderedState(state))
					}
					
					if (req.method === 'DELETE') {
						if (!existing) { 
							return sendJSON(new Response(), 404, { error: 'not found' })
						}
						
						state = state.filter((t) => t.id !== id)
						saveState(state)


						return sendJSON(new Response(), 200, getOrderedState(state))
					}
				}
				
				return sendJSON(new Response(), 405, { error: 'method not allowed' })
			}
			
			// Otherwise, serve static files from dist (built app)
			return await serveStatic(pathname)
		} catch {
			return sendText(500, 'Unhandled server error')
		}
	}
})

console.log(`Server listening on http://localhost:${PORT}`)
console.log(`Serving static files from ${DIST_DIR}`)

export {}