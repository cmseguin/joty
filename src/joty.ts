import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomBytes } from 'node:crypto'

enum Status {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done'
}

interface Item {
  id: string
  title: string
  body?: string
  status: Status
}

interface State {
  items: Item[]
}

const PORT = Number(process.env.PORT || 3000)
const DIST_DIR = path.join(process.cwd(), 'dist')

/**
 * Generate a UUID v4 style string using Node's built-in `crypto`.
 * No external dependencies.
 */
function generateUUID(): string {
	const buf = randomBytes(16)
	buf[6] = (buf[6] & 0x0f) | 0x40 // set version to 0100
	buf[8] = (buf[8] & 0x3f) | 0x80 // set variant to 10
	const hex = buf.toString('hex')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function sendJSON(res: http.ServerResponse, status: number, data: unknown) {
	const body = JSON.stringify(data)
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(body),
		'Access-Control-Allow-Origin': '*'
	})
	res.end(body)
}

function sendText(res: http.ServerResponse, status: number, text: string, contentType = 'text/plain; charset=utf-8') {
	res.writeHead(status, { 'Content-Type': contentType })
	res.end(text)
}

function mimeType(file: string) {
	const ext = path.extname(file).toLowerCase()
	switch (ext) {
		case '.html': return 'text/html; charset=utf-8'
		case '.js': return 'application/javascript; charset=utf-8'
		case '.css': return 'text/css; charset=utf-8'
		case '.json': return 'application/json; charset=utf-8'
		case '.png': return 'image/png'
		case '.jpg':
		case '.jpeg': return 'image/jpeg'
		case '.svg': return 'image/svg+xml'
		case '.ico': return 'image/x-icon'
		case '.map': return 'application/octet-stream'
		default: return 'application/octet-stream'
	}
}

function saveState(s: State) {
	fs.writeFileSync('.joty', JSON.stringify(s, null, 2), 'utf-8')
}

function loadState(): State {
	const tmpState: State = { items: [] }
	try {
		const data = fs.readFileSync('.joty', 'utf-8')
		const parsed = JSON.parse(data)
		if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
			tmpState.items = parsed.items
		}
	} catch {
		console.error('Could not load state, starting with empty state.')
	}

	return tmpState
}

function parseBody(req: http.IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', (c) => chunks.push(Buffer.from(c)))
		req.on('end', () => resolve(Buffer.concat(chunks)))
		req.on('error', reject)
	})
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string) {
	// Prevent directory traversal
	const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^\./, '')
	let filePath = path.join(DIST_DIR, safePath)

	try {
		const stat = await fs.promises.stat(filePath)
		if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
	} catch {
		// File doesn't exist. We'll fall back to index.html for SPA routing.
		filePath = path.join(DIST_DIR, 'index.html')
	}

	// Ensure file is under DIST_DIR
	if (!filePath.startsWith(DIST_DIR)) {
		sendText(res, 403, 'Forbidden')
		return
	}

	try {
		const data = await fs.promises.readFile(filePath)
		const type = mimeType(filePath)
		res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length })
		res.end(data)
	} catch {
		sendText(res, 500, 'Server error')
	}
}

const server = http.createServer(async (req, res) => {
	try {
		// Basic CORS preflight handling
		if (req.method === 'OPTIONS') {
			res.writeHead(204, {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			})
			res.end()
			return
		}

		const host = req.headers.host || `localhost:${PORT}`
		const reqUrl = new URL(req.url || '/', `http://${host}`)
		const pathname = reqUrl.pathname
		let state = loadState();

		// API: /api/items and /api/items/:id
		if (pathname.startsWith('/api/items')) {
			const parts = pathname.split('/').filter(Boolean) // ['api','items', ...]
			if (parts.length === 2) {
				// collection
				if (req.method === 'GET') {
					state = loadState()
					sendJSON(res, 200, state.items)
					return
				}

				if (req.method === 'POST') {
					state = loadState()
					const buf = await parseBody(req)
					let requestBody: Record<string, unknown> = {}

					try { requestBody = JSON.parse(buf.toString() || '{}') } catch { 
            sendJSON(res, 400, { error: 'invalid JSON' })
            return
          }

					if (
            'title' in requestBody === false || 
            typeof requestBody.title !== 'string'
          ) {
						sendJSON(res, 400, { error: 'missing or incorrect title' })
						return
					}

          if (
            typeof requestBody.body !== 'undefined' && 
            typeof requestBody.body !== 'string'
          ) {
						sendJSON(res, 400, { error: 'incorrect body' })
						return
					}
					
          const item: Item = { 
            id: generateUUID(), 
            title: requestBody.title, 
            body: requestBody.body, 
            status: Status.TODO 
          }

					state.items.push(item)
					saveState(state)
					sendJSON(res, 201, item)
					return
				}
			} else if (parts.length === 3) {
				const id = parts[2]
				if (!id) { sendJSON(res, 400, { error: 'invalid id' }); return }
				state = loadState()
				const existing = state.items.find((t) => t.id === id)

				if (req.method === 'GET') {
					if (!existing) { sendJSON(res, 404, { error: 'not found' }); return }
					sendJSON(res, 200, existing)
					return
				}

				if (req.method === 'PATCH') {
					if (!existing) { sendJSON(res, 404, { error: 'not found' }); return }

					const buf = await parseBody(req)

					let requestBody: Record<string, unknown> = {}

					try { requestBody = JSON.parse(buf.toString() || '{}') } catch { 
            sendJSON(res, 400, { error: 'invalid JSON' })
            return
          }

					if (
            'title' in requestBody === false || 
            typeof requestBody.title !== 'string'
          ) {
						sendJSON(res, 400, { error: 'missing or incorrect title' })
						return
					}

          if (
            typeof requestBody.body !== 'undefined' && 
            typeof requestBody.body !== 'string'
          ) {
						sendJSON(res, 400, { error: 'incorrect body' })
						return
					}

					const updated: Item = { 
            ...existing, 
            title: requestBody.title ?? existing.title, 
            body: requestBody.body 
          }

					const idx = state.items.findIndex((t) => t.id === id)

					if (idx >= 0) state.items[idx] = updated

					saveState(state)

					sendJSON(res, 200, updated)
					return
				}

				if (req.method === 'DELETE') {

					if (!existing) { sendJSON(res, 404, { error: 'not found' }); return }

					state.items = state.items.filter((t) => t.id !== id)

					saveState(state)

					res.writeHead(204, { 'Access-Control-Allow-Origin': '*' })

					res.end()
					return
				}
			}

			sendJSON(res, 405, { error: 'method not allowed' })
			return
		}

		// Otherwise, serve static files from dist (built app)
		await serveStatic(req, res, pathname)
	} catch {
		sendText(res, 500, 'Unhandled server error')
	}
})

server.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`)
	console.log(`Serving static files from ${DIST_DIR}`)
})

export {}

