import * as WebSocket from "ws"
import * as net from "net"
import { TimeSpan } from "../TimeSpan"
import { GetHaloRunsWr, GetHaloRunsPb } from "./HaloRuns"

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

const odstSplitNames: { [key: number]: string } = {
    0: "Prepare to Drop",
    1: "Tayari Plaza",
    2: "Streets: Drone Optic",
    3: "Uplift Reserve",
    4: "Streets: Gauss Turret",
    5: "ONI Alpha Site",
    6: "-",
    7: "Kizingo Blvd.",
    8: "-",
    9: "NMPD HQ",
    10: "-",
    11: "Kikowani Station",
    12: "-",
    13: "Data Hive",
    14: "Coastal Highway",
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
    previousSplitData: SplitData
    currentSplitData: SplitData
    nextSplitData: SplitData
    previousBestSplit: TimeSpan
    previousComparisonSplit: TimeSpan
    previousPreviousComparisonSplit: TimeSpan

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
        this.previousSplitData = {
            name: "",
            worldRecord: "",
            personalBest: "",
            bestSplit: "",
            currentComparison: "",
        }
        this.currentSplitData = {
            name: "",
            worldRecord: "",
            personalBest: "",
            bestSplit: "",
            currentComparison: "",
        }
        this.nextSplitData = {
            name: "",
            worldRecord: "",
            personalBest: "",
            bestSplit: "",
            currentComparison: "",
        }
        this.previousBestSplit = TimeSpan.zero
        this.previousComparisonSplit = TimeSpan.zero
        this.previousPreviousComparisonSplit = TimeSpan.zero
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
            return parseInt(response)
        } catch (error) {
            console.error("Error getting current split index:", error)
            return this.currentSplitIndex
        }
    }

    // For IGT splits(?), returns hh:mm:ss
    // For Real Time splits, returns hh:mm:ss.fffffff
    private async getCurrentBestSplit(): Promise<TimeSpan> {
        try {
            const currentBestSplitResponse = TimeSpan.fromString(
                await this.sendCommand("getcomparisonsplittime Best Segments")
            )

            const currentBestSplit = currentBestSplitResponse.subtract(
                this.previousBestSplit
            )
            this.previousBestSplit = currentBestSplitResponse

            return currentBestSplit
        } catch (error) {
            console.error(`Error getting best split:`, error)
            return TimeSpan.zero
        }
    }

    private async getPreviousSplitTime(): Promise<TimeSpan> {
        try {
            const previousSplitResponse = TimeSpan.fromString(
                await this.sendCommand("getlastsplittime")
            )

            const previousComparisonSplit = previousSplitResponse.subtract(
                this.previousPreviousComparisonSplit
            )
            this.previousComparisonSplit = previousSplitResponse
            return previousComparisonSplit
        } catch (error) {
            console.error(`Error getting comparison:`, error)
            return TimeSpan.zero
        }
    }

    // For IGT splits(?), returns hh:mm:ss
    // For Real Time splits, returns hh:mm:ss.fffffff
    private async getCurrentComparison(): Promise<TimeSpan> {
        try {
            const currentComparisonSplitResponse = TimeSpan.fromString(
                await this.sendCommand("getcomparisonsplittime")
            )

            const currentComparisonSplit =
                currentComparisonSplitResponse.subtract(
                    this.previousComparisonSplit
                )
            this.previousComparisonSplit = currentComparisonSplitResponse

            return currentComparisonSplit
        } catch (error) {
            console.error(`Error getting comparison:`, error)
            return TimeSpan.zero
        }
    }

    private getCurrentSplitName(): string {
        return odstSplitNames[this.currentSplitIndex] || "-"
    }

    private getNextSplitName(): string {
        return odstSplitNames[this.currentSplitIndex + 1] || "-"
    }

    private async getWorldRecord(levelName: string): Promise<TimeSpan> {
        const hrWR = await GetHaloRunsWr(
            "Halo 3: ODST",
            "Solo",
            levelName,
            "Easy"
        )
        return hrWR.Time
    }

    private getPersonalBest(levelName: string): TimeSpan {
        // This is still a placeholder as LiveSplit server doesn't have direct PB commands
        // You might need to implement custom logic to get PB data
        return GetHaloRunsPb("Halo 3: ODST", "Solo", levelName, "Easy").Time
    }

    private async getCurrentSplitData(): Promise<SplitData> {
        if (this.currentSplitIndex < 0) {
            return {
                name: "",
                worldRecord: "",
                personalBest: "",
                bestSplit: "",
                currentComparison: "",
            }
        }

        const name = this.getCurrentSplitName()
        const bestSplit = await this.getCurrentBestSplit()
        const currentComparison = await this.getCurrentComparison()
        const worldRecord = await this.getWorldRecord(name)
        const personalBest = this.getPersonalBest(name)

        const worldRecordTime =
            worldRecord.string === "00:00" ? "" : worldRecord.string
        const personalBestTime =
            personalBest.string === "00:00" ? "" : personalBest.string

        return {
            name,
            worldRecord: worldRecordTime,
            personalBest: personalBestTime,
            bestSplit: bestSplit.string,
            currentComparison: currentComparison.string,
        }
    }

    private async getNextSplitData(): Promise<SplitData> {
        if (this.currentSplitIndex < 0) {
            return {
                name: "",
                worldRecord: "",
                personalBest: "",
                bestSplit: "",
                currentComparison: "",
            }
        }

        const nextSplitName = this.getNextSplitName()
        const worldRecord = await this.getWorldRecord(nextSplitName)
        const personalBest = await this.getPersonalBest(nextSplitName)

        const worldRecordTime =
            worldRecord.string === "00:00" ? "" : worldRecord.string
        const personalBestTime =
            personalBest.string === "00:00" ? "" : personalBest.string

        return {
            name: nextSplitName,
            worldRecord: worldRecordTime,
            personalBest: personalBestTime,
            bestSplit: "",
            currentComparison: "",
        }
    }

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

    private sendTableInfo() {
        const splitInfo: SplitInfo = {
            previousSplit: this.previousSplitData,
            currentSplit: this.currentSplitData,
            nextSplit: this.nextSplitData,
        }
        const splitMessage = JSON.stringify(splitInfo)

        this.wssSplitData.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(splitMessage)
            }
        })
    }

    private async updateTableInfo() {
        try {
            if (this.currentSplitIndex < 0) {
                this.previousSplitData = {
                    name: "",
                    worldRecord: "",
                    personalBest: "",
                    bestSplit: "",
                    currentComparison: "",
                }
                this.currentSplitData = {
                    name: "",
                    worldRecord: "",
                    personalBest: "",
                    bestSplit: "",
                    currentComparison: "",
                }
                this.nextSplitData = {
                    name: "",
                    worldRecord: "",
                    personalBest: "",
                    bestSplit: "",
                    currentComparison: "",
                }
                this.previousBestSplit = TimeSpan.zero
                this.previousComparisonSplit = TimeSpan.zero
                this.previousPreviousComparisonSplit = TimeSpan.zero
            } else {
                this.previousSplitData = this.currentSplitData
                this.previousSplitData.currentComparison = (
                    await this.getPreviousSplitTime()
                ).string
                this.currentSplitData = await this.getCurrentSplitData()
                this.nextSplitData = await this.getNextSplitData()
            }

            this.sendTableInfo()

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

                if (this.currentSplitIndex !== currentIndex) {
                    this.currentSplitIndex = currentIndex
                    console.log(
                        `Current split index: ${this.currentSplitIndex}`
                    )
                    await this.updateTableInfo()
                }
            } catch (error: any) {
                // Handle polling failure
                console.error(`Ping failed: ${error.message}`)
            }
        }, 2000)

        setInterval(() => this.sendTableInfo(), 10000)
    }
}
