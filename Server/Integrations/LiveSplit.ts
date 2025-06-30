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
import { Games_Commands } from "../../Data/Naming/GamesAndLevels/Games_Commands";

interface SplitData {
  name: string;
  worldRecord: string;
  personalBest: string;
  pbRank: number;
  bestSplit: string;
  currentComparison: string;
}

interface SplitInfo {
  previousSplit?: SplitData;
  currentSplit: SplitData;
  nextSplit?: SplitData;
}

const h1SplitNames: { [key: number]: string } = {
  0: "The Pillar of Autumn",
  1: "Halo",
  2: "The Truth and Reconciliation",
  3: "The Silent Cartographer",
  4: "Assault on the Control Room",
  5: "343 Guilty Spark",
  6: "The Library",
  7: "Two Betrayals",
  8: "Keyes",
  9: "The Maw",
};

const h2SplitNames: { [key: number]: string } = {
  0: "Cairo Station",
  1: "Outskirts",
  3: "Metropolis",
  4: "The Arbiter",
  5: "The Oracle",
  6: "Delta Halo",
  7: "Regret",
  8: "Sacred Icon",
  9: "Quarantine Zone",
  10: "Gravemind",
  11: "Uprising",
  12: "High Charity",
  13: "The Great Journey",
};

const h3SplitNames: { [key: number]: string } = {
  0: "Sierra 117",
  1: "Crow's Nest",
  2: "Tsavo Highway",
  3: "The Storm",
  4: "Floodgate",
  5: "The Ark",
  6: "The Covenant",
  7: "Cortana",
  8: "Halo",
};

const odstSplitNames: { [key: number]: string } = {
  0: "Prepare to Drop",
  1: "Tayari Plaza",
  2: "Streets: Drone Optic",
  3: "Uplift Reserve",
  4: "Streets: Gauss Turret",
  5: "ONI Alpha Site",
  6: "Mombasa Streets 3",
  7: "Kizingo Blvd.",
  8: "Mombasa Streets 4",
  9: "NMPD HQ",
  10: "Mombasa Streets 5",
  11: "Kikowani Station",
  12: "Mombasa Streets 6",
  13: "Data Hive",
  14: "Coastal Highway",
};

const reachSplitNames: { [key: number]: string } = {
  0: "Winter Contingency",
  1: "ONI: Sword Base",
  2: "Nightfall",
  3: "Tip of the Spear",
  4: "Long Night of Solace",
  5: "Exodus",
  6: "New Alexandria",
  7: "The Package",
  8: "The Pillar of Autumn",
};

const h4SplitNames: { [key: number]: string } = {
  0: "Dawn",
  1: "Requiem",
  2: "Forerunner",
  3: "Infinity",
  4: "Reclaimer",
  5: "Shutdown",
  6: "Composer",
  7: "Midnight",
};

const h5SplitNames: { [key: number]: string } = {
  0: "Osiris",
  1: "Blue Team",
  2: "Glassed",
  3: "Meridian Station",
  4: "Unconfirmed",
  5: "Evacuation",
  6: "Reunion",
  7: "Swords of Sanghelios",
  8: "Alliance",
  9: "Enemy Lines",
  10: "Before the Storm",
  11: "Battle of Sunaion",
  12: "Genesis",
  13: "The Breaking",
  14: "Guardians",
};

const infiniteSplitNames: { [key: number]: string } = {};

const gameToSplitMapping: { [key: string]: { [key: number]: string } } = {
  "Halo CE": h1SplitNames,
  "Halo CE Classic": h1SplitNames,
  "Halo 2": h2SplitNames,
  "Halo 2 MCC": h2SplitNames,
  "Halo 3": h3SplitNames,
  "Halo 3: ODST": odstSplitNames,
  "Halo Reach": reachSplitNames,
  "Halo 4": h4SplitNames,
  "Halo 5": h5SplitNames,
  "Halo Infinite": infiniteSplitNames,
};

// Time formats: [-][[[d.]hh:]mm:]ss[.fffffff]
// https://github.com/livesplit/livesplit?tab=readme-ov-file#the-livesplit-server
// https://github.com/LiveSplit/LiveSplit/blob/master/src/LiveSplit.Core/Server/CommandServer.cs#L167
export class LiveSplitClient {
  private static instance: LiveSplitClient = this.getInstance();

  host: string;
  port: number;
  client: net.Socket | null = null;
  liveSplitPollInterval: NodeJS.Timeout | null = null;
  pendingCommands: Map<number, (response: string) => void> = new Map();
  commandId: number = 0;
  wssVirgil: WebSocket.Server;
  wssSplitData: WebSocket.Server;
  currentSplitIndex: number;
  previousSplitData: SplitData;
  currentSplitData: SplitData;
  nextSplitData: SplitData;
  previousBestSplit: TimeSpan;
  previousComparisonSplit: TimeSpan;
  previousPreviousComparisonSplit: TimeSpan;
  activeSplitNames: { [key: number]: string } = {};
  game: string;
  category: string;
  difficulty: string;
  runnableSegment: string;

  private constructor() {
    this.host = "localhost";
    this.port = 16834;
    this.client = null;
    this.liveSplitPollInterval = null;
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
    };
    this.currentSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
    };
    this.nextSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
    };
    this.previousBestSplit = TimeSpan.zero;
    this.previousComparisonSplit = TimeSpan.zero;
    this.previousPreviousComparisonSplit = TimeSpan.zero;
    this.activeSplitNames = odstSplitNames;
    this.game = "Halo 3: ODST";
    this.difficulty = "Easy";
    this.category = "Solo";
    this.runnableSegment = "Full Game";
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

    let msgSplitArray = msg.message.text.toLowerCase().split(" ");

    if (msgSplitArray.length != 5) {
      let hrMessage = structuredClone(Wingbot953Message);
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

    this.updateTableInfo();
  }

  public connect() {
    this.client = new net.Socket();

    this.client.connect(this.port, this.host, () => {
      console.log(`Connected to LiveSplit server at ${this.host}:${this.port}`);
      this.startPolling();
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
      console.error(`Connection error: ${error.message}`);
      this.cleanup();
    });

    this.client.on("close", () => {
      console.log("Connection closed");
      this.cleanup();
    });
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
      let index = parseInt(response);
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
    return this.activeSplitNames[this.currentSplitIndex] || "-";
  }

  private getNextSplitName(): string {
    return this.activeSplitNames[this.currentSplitIndex + 1] || "-";
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
      };
    }

    let name = "";
    if (this.runnableSegment === "Full Game") {
      name = this.getCurrentSplitName();
    } else {
      name = this.runnableSegment;
    }
    const bestSplit = await this.getCurrentBestSplit();
    const currentComparison = await this.getCurrentComparison();
    const worldRecord = await this.getWorldRecord(name);
    const personalBest = this.getPersonalBest(name);

    const worldRecordTime =
      worldRecord.string === "00:00" ? "" : worldRecord.string;
    const personalBestTime =
      personalBest.time.string === "00:00" ? "" : personalBest.time.string;

    return {
      name,
      worldRecord: worldRecordTime,
      personalBest: personalBestTime,
      pbRank: personalBest.pbRank,
      bestSplit: bestSplit.string,
      currentComparison: currentComparison.string,
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
      };
    }

    const nextSplitName = this.getNextSplitName();
    const worldRecord = await this.getWorldRecord(nextSplitName);
    const personalBest = await this.getPersonalBest(nextSplitName);

    const worldRecordTime =
      worldRecord.string === "00:00" ? "" : worldRecord.string;
    const personalBestTime =
      personalBest.time.string === "00:00" ? "" : personalBest.time.string;

    return {
      name: nextSplitName,
      worldRecord: worldRecordTime,
      personalBest: personalBestTime,
      pbRank: personalBest.pbRank,
      bestSplit: "",
      currentComparison: "",
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
      // Logic to determine Virgil's mood based on run progress
      const delta = await this.getDelta();
      if (delta.totalMilliseconds < 0) {
        return "Happy";
      } else if (
        this.previousBestSplit.totalMilliseconds >
        this.previousComparisonSplit.totalMilliseconds
      ) {
        return "Happy";
      } else if (delta.totalMilliseconds > 0) {
        return "Disappointed";
      }

      return "Neutral";
    } catch (error) {
      console.error("Error determining Virgil's mood:", error);
      return "Neutral";
    }
  }

  private sendTableInfo() {
    if (this.runnableSegment === "Full Game") {
      this.sentMultiLevelTableInfo();
    } else {
      this.sentSingleLevelTableInfo();
    }
  }

  private sentSingleLevelTableInfo() {
    const splitInfo: SplitInfo = {
      currentSplit: this.currentSplitData,
    };
    const splitMessage = JSON.stringify(splitInfo);

    this.wssSplitData.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(splitMessage);
      }
    });
  }

  private sentMultiLevelTableInfo() {
    const splitInfo: SplitInfo = {
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

  private async clearTable() {
    this.currentSplitIndex = -1;
    this.previousSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
    };
    this.currentSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
    };
    this.nextSplitData = {
      name: "",
      worldRecord: "",
      personalBest: "",
      pbRank: 0,
      bestSplit: "",
      currentComparison: "",
    };
    this.previousBestSplit = TimeSpan.zero;
    this.previousComparisonSplit = TimeSpan.zero;
    this.previousPreviousComparisonSplit = TimeSpan.zero;
  }

  private async updateTableInfo() {
    try {
      if (this.currentSplitIndex < 0) {
        this.clearTable();
      } else {
        this.previousSplitData = this.currentSplitData;
        this.previousSplitData.currentComparison = (
          await this.getPreviousSplitTime()
        ).string;
        this.currentSplitData = await this.getCurrentSplitData();
        this.nextSplitData = await this.getNextSplitData();
      }

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

  private async startPolling() {
    this.liveSplitPollInterval = setInterval(async () => {
      try {
        const currentIndex = await this.getCurrentSplitIndex();

        if (this.currentSplitIndex !== currentIndex) {
          this.currentSplitIndex = currentIndex;
          console.log(`Current split index: ${this.currentSplitIndex}`);
          await this.updateTableInfo();
        }
      } catch (error: any) {
        // Handle polling failure
        console.error(`LiveSplit poll failed: ${error.message}`);
      }
    }, 2000);

    setInterval(() => this.sendTableInfo(), 10000);
  }
}
