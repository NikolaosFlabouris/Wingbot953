import * as WebSocket from "ws";
import * as net from "net";
import { TimeSpan } from "../TimeSpan";
import {
  GetHaloRunsWr,
  GetHaloRunsPb,
  FindHaloRunsCompatibleNames,
} from "./HaloRuns";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import {
  type SplitDetails,
  odstSplitNames,
  gameToSplitMapping,
  findCharacterForSegment,
  determineVirgilMood,
  formatTimeDisplay,
} from "./LiveSplitData";

interface SplitData {
  name: string;
  worldRecord: string;
  personalBest: string;
  pbRank: number;
  bestSplit?: string;
  currentComparison?: string;
  character: string;
}

interface SplitInfo {
  game?: string;
  category?: string;
  runnableSegment?: string;
  difficulty?: string;
  previousSplit?: SplitData;
  currentSplit: SplitData;
  nextSplit?: SplitData;
}

// Time formats: [-][[[d.]hh:]mm:]ss[.fffffff]
// https://github.com/livesplit/livesplit?tab=readme-ov-file#the-livesplit-server
// https://github.com/LiveSplit/LiveSplit/blob/master/src/LiveSplit.Core/Server/CommandServer.cs#L167
export class LiveSplitClient {
  private static instance: LiveSplitClient = this.getInstance();

  private host: string;
  private port: number;
  private client: net.Socket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private liveSplitPollInterval: NodeJS.Timeout | null = null;
  private splitTableInterval: NodeJS.Timeout | null = null;
  private pendingCommands: Map<number, (response: string) => void> = new Map();
  private commandId: number = 0;
  private wssVirgil: WebSocket.Server;
  private wssSplitData: WebSocket.Server;
  private currentSplitIndex: number;
  private previousSplitData: SplitData;
  private currentSplitData: SplitData;
  private nextSplitData: SplitData;
  private previousBestSplit: TimeSpan;
  private previousComparisonSplit: TimeSpan;
  private previousPreviousComparisonSplit: TimeSpan;
  private activeSplitNames: { [key: number]: SplitDetails } = {};
  private game: string;
  private category: string;
  private difficulty: string;
  private runnableSegment: string;
  private currentWr: TimeSpan;
  private currentPersonalBest: TimeSpan;
  private currentPbRank: number;

  private constructor() {
    this.host = "localhost";
    this.port = 16834;
    this.client = null;
    this.reconnectTimer = null;
    this.liveSplitPollInterval = null;
    this.splitTableInterval = null;
    this.pendingCommands = new Map();
    this.commandId = 0;
    this.wssVirgil = new WebSocket.Server({ port: 8081 });
    this.wssSplitData = new WebSocket.Server({ port: 8082 });
    this.currentSplitIndex = -1;
    this.previousSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.currentSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.nextSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.previousBestSplit = TimeSpan.zero;
    this.previousComparisonSplit = TimeSpan.zero;
    this.previousPreviousComparisonSplit = TimeSpan.zero;
    this.activeSplitNames = odstSplitNames;
    this.game = "Halo 3: ODST";
    this.category = "Solo";
    this.runnableSegment = "Full Game";
    this.difficulty = "Easy";
    this.currentWr = TimeSpan.zero;
    this.currentPersonalBest = TimeSpan.zero;
    this.currentPbRank = 0;
  }

  public static getInstance(): LiveSplitClient {
    if (!this.instance) {
      this.instance = new LiveSplitClient();
    }
    return this.instance;
  }

  public setGame(msg: UnifiedChatMessage) {
    if (!LiveSplitClient.instance) {
      LiveSplitClient.getInstance();
    }

    const msgSplitArray = msg.message.text.toLowerCase().split(" ");

    if (msgSplitArray.length != 5) {
      const hrMessage = structuredClone(Wingbot953Message);
      hrMessage.platform = msg.platform;
      hrMessage.message.text = `Incorrect number of parameters for command`;
      sendChatMessage(hrMessage);
      return;
    }

    [this.game, this.category, this.runnableSegment, this.difficulty] =
      FindHaloRunsCompatibleNames(
        msgSplitArray[1].trim().toLowerCase(), //gameName
        msgSplitArray[2].trim().toLowerCase(), //category
        msgSplitArray[3].trim().toLowerCase(), //runnableSegment
        msgSplitArray[4].trim().toLowerCase(), //difficulty
        msg
      );

    this.activeSplitNames = gameToSplitMapping[this.game];

    GetHaloRunsWr(
      this.game,
      this.category,
      this.runnableSegment,
      this.difficulty
    )
      .then((wr) => {
        this.currentWr = wr.Time;
        const hrPb = GetHaloRunsPb(
          this.game,
          this.category,
          this.runnableSegment,
          this.difficulty
        );
        this.currentPersonalBest = hrPb.Time;
        this.currentPbRank = hrPb.Rank;
        void this.updateTableInfo();
      })
      .catch((error: unknown) => {
        console.error("Error fetching world record:", error);
      });
  }

  public connect() {
    if (this.client && !this.client.destroyed) {
      console.log("LiveSplitClient - Already connected");
      return;
    }

    this.client?.destroy();
    this.client = null;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connectToLiveSplitServer();
  }

  private connectToLiveSplitServer() {
    if (!this.client || this.client.destroyed) {
      this.client = new net.Socket();
    }

    this.client.connect(this.port, this.host, () => {
      console.log(`Connected to LiveSplit server at ${this.host}:${this.port}`);
      void this.startPolling();

      // Clear reconnect timer on successful connection
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.client.on("data", (data) => {
      const response = data.toString().trim();

      // Resolve the oldest pending command
      const entries = Array.from(this.pendingCommands.entries());
      if (entries.length > 0) {
        const [id, resolve] = entries[0];
        this.pendingCommands.delete(id);
        resolve(response);
      }
    });

    this.client.on("error", (error) => {
      if (error.message) {
        console.error(`LiveSplitClient - Connection error: ${error.message}`);
      }
      this.scheduleReconnect();
    });

    this.client.on("close", () => {
      this.stopPolling();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  public async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.client || this.client.destroyed) {
        reject(new Error("Not connected to server"));
        return;
      }

      const id = this.commandId++;
      this.pendingCommands.set(id, resolve);
      this.client.write(`${command}\r\n`);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error("Command timeout"));
        }
      }, 10000);
    });
  }

  private cleanup() {
    if (this.liveSplitPollInterval) {
      clearInterval(this.liveSplitPollInterval);
      this.liveSplitPollInterval = null;
    }
    // Reject all pending commands
    this.pendingCommands.forEach((resolve) => resolve("Connection closed"));
    this.pendingCommands.clear();
    if (this.client && !this.client.destroyed) {
      this.client.destroy();
    }
  }

  public disconnect() {
    this.cleanup();
  }

  // -1 for splits not started
  private async getCurrentSplitIndex(): Promise<number> {
    try {
      const response = await this.sendCommand("getsplitindex");
      const index = parseInt(response);
      if (Number.isNaN(index)) {
        throw new Error("LiveSplit index is NaN");
      }
      return parseInt(response);
    } catch (error) {
      console.error("Error getting current split index:", error);
      return -1;
    }
  }

  // For IGT splits(?), returns hh:mm:ss
  // For Real Time splits, returns hh:mm:ss.fffffff
  private async getCurrentBestSplit(): Promise<TimeSpan> {
    try {
      const currentBestSplitResponse = TimeSpan.fromString(
        await this.sendCommand("getcomparisonsplittime Best Segments")
      );

      const currentBestSplit = currentBestSplitResponse.subtract(
        this.previousBestSplit
      );
      this.previousBestSplit = currentBestSplitResponse;

      return currentBestSplit;
    } catch (error) {
      console.error(`Error getting best split:`, error);
      return TimeSpan.zero;
    }
  }

  private async getPreviousSplitTime(): Promise<TimeSpan> {
    try {
      const previousSplitResponse = TimeSpan.fromString(
        await this.sendCommand("getlastsplittime")
      );

      const previousComparisonSplit = previousSplitResponse.subtract(
        this.previousPreviousComparisonSplit
      );
      this.previousPreviousComparisonSplit = previousSplitResponse;
      return previousComparisonSplit;
    } catch (error) {
      console.error(`Error getting comparison:`, error);
      return TimeSpan.zero;
    }
  }

  // For IGT splits(?), returns hh:mm:ss
  // For Real Time splits, returns hh:mm:ss.fffffff
  private async getCurrentComparison(): Promise<TimeSpan> {
    try {
      const currentComparisonSplitResponse = TimeSpan.fromString(
        await this.sendCommand("getcomparisonsplittime")
      );

      const currentComparisonSplit = currentComparisonSplitResponse.subtract(
        this.previousComparisonSplit
      );
      this.previousComparisonSplit = currentComparisonSplitResponse;

      return currentComparisonSplit;
    } catch (error) {
      console.error(`Error getting comparison:`, error);
      return TimeSpan.zero;
    }
  }

  private getCurrentSplitName(): string {
    return this.activeSplitNames[this.currentSplitIndex].name || "-";
  }

  private getNextSplitName(): string {
    return this.activeSplitNames[this.currentSplitIndex + 1].name || "-";
  }

  private async getWorldRecord(levelName: string): Promise<TimeSpan> {
    const hrWR = await GetHaloRunsWr(
      this.game,
      this.category,
      levelName,
      this.difficulty
    );
    return hrWR.Time;
  }

  private getPersonalBest(levelName: string): {
    time: TimeSpan;
    pbRank: number;
  } {
    const pb = GetHaloRunsPb(
      this.game,
      this.category,
      levelName,
      this.difficulty
    );
    return {
      time: pb.Time,
      pbRank: pb.Rank,
    };
  }

  private async getCurrentSplitData(): Promise<SplitData> {
    if (
      this.currentSplitIndex < 0 ||
      this.currentSplitIndex >= Object.keys(this.activeSplitNames).length
    ) {
      return {
        name: "",
        worldRecord: "",
        personalBest: "",
        pbRank: 0,
        bestSplit: "",
        currentComparison: "",
        character: "",
      };
    }

    const name = this.runnableSegment === "Full Game"
      ? this.getCurrentSplitName()
      : this.runnableSegment;
    const bestSplit = await this.getCurrentBestSplit();
    const currentComparison = await this.getCurrentComparison();
    const worldRecord = await this.getWorldRecord(name);
    const personalBest = this.getPersonalBest(name);

    return {
      name,
      worldRecord: formatTimeDisplay(worldRecord.string),
      personalBest: formatTimeDisplay(personalBest.time.string),
      pbRank: personalBest.pbRank,
      bestSplit: bestSplit.string,
      currentComparison: currentComparison.string,
      character: this.activeSplitNames[this.currentSplitIndex].character,
    };
  }

  private async getNextSplitData(): Promise<SplitData> {
    if (
      this.currentSplitIndex < 0 ||
      this.currentSplitIndex + 1 >= Object.keys(this.activeSplitNames).length
    ) {
      return {
        name: "",
        worldRecord: "",
        personalBest: "",
        pbRank: 0,
        bestSplit: "",
        currentComparison: "",
        character: "",
      };
    }

    const nextSplitName = this.getNextSplitName();
    const worldRecord = await this.getWorldRecord(nextSplitName);
    const personalBest = this.getPersonalBest(nextSplitName);

    return {
      name: nextSplitName,
      worldRecord: formatTimeDisplay(worldRecord.string),
      personalBest: formatTimeDisplay(personalBest.time.string),
      pbRank: personalBest.pbRank,
      bestSplit: "",
      currentComparison: "",
      character: this.activeSplitNames[this.currentSplitIndex].character,
    };
  }

  private async getDelta(): Promise<TimeSpan> {
    try {
      return TimeSpan.fromString(await this.sendCommand("getdelta"));
    } catch (error) {
      console.error("Error getting delta:", error);
      return TimeSpan.zero;
    }
  }

  private async getVirgilMood(): Promise<string> {
    try {
      if (this.currentSplitIndex < 0) return "Neutral";
      const delta = await this.getDelta();
      return determineVirgilMood(
        delta.totalMilliseconds,
        this.previousBestSplit.totalMilliseconds,
        this.previousComparisonSplit.totalMilliseconds
      );
    } catch (error) {
      console.error("Error determining Virgil's mood:", error);
      return "Neutral";
    }
  }

  private sendTableInfo() {
    if (this.runnableSegment === "Full Game") {
      this.sendMultiLevelTableInfo();
    } else {
      this.sendSingleLevelTableInfo();
    }
  }

  private sendSingleLevelTableInfo() {
    const splitInfo: SplitInfo = {
      game: this.game,
      category: this.category,
      difficulty: this.difficulty,
      runnableSegment: this.runnableSegment,
      currentSplit: {
        name: this.runnableSegment,
        worldRecord: this.currentWr.string,
        personalBest: this.currentPersonalBest.string,
        pbRank: this.currentPbRank,
        character: findCharacterForSegment(this.activeSplitNames, this.runnableSegment),
      },
    };

    const splitMessage = JSON.stringify(splitInfo);

    this.wssSplitData.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(splitMessage);
      }
    });
  }

  private sendMultiLevelTableInfo() {
    const splitInfo: SplitInfo = {
      game: this.game,
      category: this.category,
      difficulty: this.difficulty,
      runnableSegment: this.runnableSegment,
      previousSplit: this.previousSplitData,
      currentSplit: this.currentSplitData,
      nextSplit: this.nextSplitData,
    };
    const splitMessage = JSON.stringify(splitInfo);

    this.wssSplitData.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(splitMessage);
      }
    });
  }

  private clearTable() {
    this.currentSplitIndex = -1;
    this.previousSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.currentSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.nextSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
      character: "",
    };
    this.previousBestSplit = TimeSpan.zero;
    this.previousComparisonSplit = TimeSpan.zero;
    this.previousPreviousComparisonSplit = TimeSpan.zero;
  }

  private async updateTableInfo() {
    try {
      if (this.currentSplitIndex < 0) {
        this.clearTable();
        return;
      }

      this.previousSplitData = this.currentSplitData;
      this.previousSplitData.currentComparison = (
        await this.getPreviousSplitTime()
      ).string;
      this.currentSplitData = await this.getCurrentSplitData();
      this.nextSplitData = await this.getNextSplitData();

      this.sendTableInfo();

      const virgilMood = await this.getVirgilMood();

      console.log("Virgil's mood:", virgilMood);
      const virgilMessage = JSON.stringify(virgilMood);
      this.wssVirgil.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(virgilMessage);
        }
      });
    } catch (error) {
      console.error("Error broadcasting update:", error);
    }
  }

  private startPolling() {
    this.liveSplitPollInterval = setInterval(() => {
      void (async () => {
        try {
          const currentIndex = await this.getCurrentSplitIndex();

          if (this.currentSplitIndex !== currentIndex) {
            this.currentSplitIndex = currentIndex;
            console.log(`Current split index: ${this.currentSplitIndex}`);
            await this.updateTableInfo();
          }
        } catch (error: unknown) {
          console.error(`LiveSplit poll failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      })();
    }, 2000);

    this.splitTableInterval = setInterval(() => {
      this.sendTableInfo();
    }, 10000);
  }

  private stopPolling() {
    if (!this.liveSplitPollInterval && !this.splitTableInterval) {
      return;
    }

    console.log("Stopping LiveSplit polling and clearing data...");

    if (this.liveSplitPollInterval) {
      clearInterval(this.liveSplitPollInterval);
      this.liveSplitPollInterval = null;
    }

    if (this.splitTableInterval) {
      clearInterval(this.splitTableInterval);
      this.splitTableInterval = null;
    }

    this.clearTable();
    this.sendTableInfo();

    const virgilMessage = JSON.stringify("Neutral");
    this.wssVirgil.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(virgilMessage);
      }
    });
  }
}
