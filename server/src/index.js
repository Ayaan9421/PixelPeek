import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { env } from './config/env.js'
import { registerSocketHandlers } from './sockets/index.js'
import imageRoutes from './routes/imageRoutes.js'

const app = express()
const allowedOrigins = process.env.CLIENT_ORIGIN.split(",")
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/health', (req, res) => {
        res.json({ status: 'ok' })
})

app.use('/api', imageRoutes)

const httpServer = createServer(app)


const io = new Server(httpServer, {
        cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST']
        },
})

app.set('io', io)

io.on('connection', (socket) => {
        console.log(`socket connected: ${socket.id}`)
        registerSocketHandlers(io, socket)
})

httpServer.listen(env.port, () => {
        console.log(`server listening on port: ${env.port} [${env.nodeEnv}]`)
})
