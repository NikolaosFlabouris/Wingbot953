import * as WebSocket from "ws"
import * as net from "net"
import { TimeSpan } from "../TimeSpan"

interface SplitData {
    name: string
    worldRecord: string
    personalBest: string
    bestSplit: string
    currentComparison: string
}

interface SplitInfo {
    previousSplit?: SplitData
    currentSplit: SplitData
    nextSplit?: SplitData
}

// Time formats: [-][[[d.]hh:]mm:]ss[.fffffff]
export class LiveSplitClient {
    host: string
    port: number
    client: net.Socket | null = null
    pingInterval: NodeJS.Timeout | null = null
    pendingCommands: Map<number, (response: string) => void> = new Map()
    commandId: number = 0
    wssVirgil: WebSocket.Server
    wssSplitData: WebSocket.Server
    currentSplitIndex: number

    constructor(host = "localhost", port = 16834) {
        this.host = host
        this.port = port
        this.client = null
        this.pingInterval = null
        this.pendingCommands = new Map()
        this.commandId = 0
        this.wssVirgil = new WebSocket.Server({ port: 8081 })
        this.wssSplitData = new WebSocket.Server({ port: 8082 })
        this.currentSplitIndex = -1
    }

    public connect() {
        this.client = new net.Socket()

        this.client.connect(this.port, this.host, () => {
            console.log(
                `Connected to LiveSplit server at ${this.host}:${this.port}`
            )
            this.startPolling()
        })

        this.client.on("data", (data) => {
            const response = data.toString().trim()

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

    public async sendCommand(command: string): Promise<string> {
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

    private cleanup() {
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

    public disconnect() {
        this.cleanup()
    }

    // -1 for splits not started
    private async getCurrentSplitIndex(): Promise<number> {
        try {
            const response = await this.sendCommand("getsplitindex")
            console.log("Current split index response:", response)
            return parseInt(response) || -1
        } catch (error) {
            console.error("Error getting current split index:", error)
            return this.currentSplitIndex
        }
    }

    // For IGT splits(?), returns hh:mm:ss
    // For Real Time splits, returns hh:mm:ss.fffffff
    private async getCurrentBestSplit(): Promise<TimeSpan> {
        try {
            return TimeSpan.fromString(
                await this.sendCommand("getcomparisonsplittime Best Segments")
            )
        } catch (error) {
            console.error(`Error getting best split:`, error)
            return TimeSpan.zero
        }
    }

    // For IGT splits(?), returns hh:mm:ss
    // For Real Time splits, returns hh:mm:ss.fffffff
    private async getCurrentComparison(): Promise<TimeSpan> {
        try {
            return TimeSpan.fromString(
                await this.sendCommand("getcurrentsplittime")
            )
        } catch (error) {
            console.error(`Error getting comparison:`, error)
            return TimeSpan.zero
        }
    }

    private async getCurrentSplitName(): Promise<string> {
        try {
            return await this.sendCommand("getcurrentsplitname")
        } catch (error) {
            console.error(`Error getting current split name.`, error)
            return "-"
        }
    }

    private async getWorldRecord(levelName: string): Promise<TimeSpan> {
        // This is still a placeholder as LiveSplit server doesn't have direct WR commands
        // You might need to implement custom logic to get WR data
        return TimeSpan.fromString("00:30.00")
    }

    private async getPersonalBest(levelName: string): Promise<TimeSpan> {
        // This is still a placeholder as LiveSplit server doesn't have direct PB commands
        // You might need to implement custom logic to get PB data
        return TimeSpan.fromString("00:30.00")
    }

    private async getPreviousSplitData(): Promise<SplitData | null> {}

    private async getCurrentSplitData(): Promise<SplitData> {
        const name = await this.getCurrentSplitName()
        const bestSplit = await this.getCurrentBestSplit()
        const currentComparison = await this.getCurrentComparison()
        const worldRecord = await this.getWorldRecord(name)
        const personalBest = await this.getPersonalBest(name)

        console.log(
            "Split Data:",
            name,
            worldRecord.string,
            personalBest.string,
            bestSplit.string,
            currentComparison.string
        )

        return {
            name,
            worldRecord: worldRecord.string,
            personalBest: personalBest.string,
            bestSplit: bestSplit.string,
            currentComparison: currentComparison.string,
        }
    }

    private async getNextSplitData(): Promise<SplitData | null> {}

    private async getDelta(): Promise<TimeSpan> {
        try {
            return TimeSpan.fromString(await this.sendCommand("getdelta"))
        } catch (error) {
            console.error("Error getting delta:", error)
            return TimeSpan.zero
        }
    }

    private async getVirgilMood(): Promise<string> {
        try {
            // Logic to determine Virgil's mood based on run progress
            const delta = await this.getDelta()
            if (delta.totalMilliseconds < 0) {
                return "Happy"
            } else if (delta.totalMilliseconds > 0) {
                return "Disappointed"
            }
            return "Neutral"
        } catch (error) {
            console.error("Error determining Virgil's mood:", error)
            return "Neutral"
        }
    }

    private async broadcastUpdate() {
        try {
            //const previousSplit = await this.getPreviousSplitData()
            const currentSplit = await this.getCurrentSplitData()
            //const nextSplit = await this.getNextSplitData()
            const splitInfo: SplitInfo = {
                previousSplit: currentSplit,
                currentSplit: currentSplit,
                nextSplit: currentSplit,
            }
            const splitMessage = JSON.stringify(splitInfo)

            this.wssSplitData.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(splitMessage)
                }
            })

            const virgilMood = await this.getVirgilMood()

            console.log("Virgil's mood:", virgilMood)
            const virgilMessage = JSON.stringify(virgilMood)
            this.wssVirgil.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(virgilMessage)
                }
            })
        } catch (error) {
            console.error("Error broadcasting update:", error)
        }
    }

    private async startPolling() {
        this.pingInterval = setInterval(async () => {
            try {
                const currentIndex = await this.getCurrentSplitIndex()
                console.log(
                    `Current split index: ${currentIndex}, Previous: ${this.currentSplitIndex}`
                )
                //if (this.currentSplitIndex !== currentIndex) {
                //    this.currentSplitIndex = currentIndex
                await this.broadcastUpdate()
                //}
            } catch (error: any) {
                // Handle polling failure
                console.error(`Ping failed: ${error.message}`)
            }
        }, 5000)
    }
}
