declare module "livesplit-client" {
    export class LiveSplitClient {
        constructor(address: string)
        connect(): boolean
        disconnect(): Promise<void>
        send(command: string, expectResponse?: boolean): Promise<string>
        on(event: "disconnect", callback: () => void): void
        startTimer(): boolean
        startOrSplit(): boolean
        split(): boolean
        unsplit(): boolean
        skipSplit(): boolean
        pause(): boolean
        resume(): boolean
        reset(): boolean
        initGameTime(): boolean
        setGameTime(time): boolean
        setLoadingTimes(time): boolean
        pauseGameTime(): boolean
        unpauseGameTime(): boolean
        setComparison(comparison): boolean
        getDelta(comparison?: string): Promise<any>
        getLastSplitTime(): Promise<any>
        getComparisonSplitTime(): Promise<any>
        getCurrentTime(): Promise<any>
        getFinalTime(comparison?: string): Promise<any>
        getPredictedTime(comparison?: string): Promise<any>
        getBestPossibleTime(): Promise<any>
        getSplitIndex(): Promise<number>
        getCurrentSplitName(): Promise<any>
        getPreviousSplitName(): Promise<any>
        getCurrentTimerPhase(): Promise<any>
        getAll(): Promise<any>
    }
}
