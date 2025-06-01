const net = require("net")

class LiveSplitPingClient {
    constructor(host = "localhost", port = 16834) {
        this.host = host
        this.port = port
        this.client = null
        this.pingInterval = null
        this.pendingCommands = new Map()
        this.commandId = 0
    }

    connect() {
        this.client = new net.Socket()

        this.client.connect(this.port, this.host, () => {
            console.log(
                `Connected to LiveSplit server at ${this.host}:${this.port}`
            )
            this.startPinging()
        })

        this.client.on("data", (data) => {
            const response = data.toString().trim()
            console.log(`Response: ${response}`)

            // Resolve the oldest pending command
            const entries = Array.from(this.pendingCommands.entries())
            if (entries.length > 0) {
                const [id, resolve] = entries[0]
                this.pendingCommands.delete(id)
                resolve(response)
            }
        })

        this.client.on("error", (error) => {
            console.error(`Connection error: ${error.message}`)
            this.cleanup()
        })

        this.client.on("close", () => {
            console.log("Connection closed")
            this.cleanup()
        })
    }

    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            if (!this.client || this.client.destroyed) {
                reject(new Error("Not connected to server"))
                return
            }

            const id = this.commandId++
            this.pendingCommands.set(id, resolve)
            this.client.write(`${command}\r\n`)

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingCommands.has(id)) {
                    this.pendingCommands.delete(id)
                    reject(new Error("Command timeout"))
                }
            }, 10000)
        })
    }

    startPinging() {
        this.pingInterval = setInterval(async () => {
            try {
                const response = await this.sendCommand("getdelta")
                console.log(`Ping successful: ${response}`)
            } catch (error) {
                console.error(`Ping failed: ${error.message}`)
            }
        }, 5000)
    }

    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }
        // Reject all pending commands
        this.pendingCommands.forEach((resolve) => resolve("Connection closed"))
        this.pendingCommands.clear()
        if (this.client && !this.client.destroyed) {
            this.client.destroy()
        }
    }

    disconnect() {
        this.cleanup()
    }
}

// Usage
const client = new LiveSplitPingClient()
client.connect()

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\nShutting down...")
    client.disconnect()
    process.exit(0)
})
