import { HCELevels_Commands } from "./HCELevels_Commands"
import { H2Levels_Commands } from "./H2Levels_Commands"
import { H2MCCLevels_Commands } from "./H2MCCLevels_Commands"
import { H3Levels_Commands } from "./H3Levels_Commands"
import { ODSTLevels_Commands } from "./ODSTLevels_Commands"
import { ReachLevels_Commands } from "./ReachLevels_Commands"
import { H4Levels_Commands } from "./H4Levels_Commands"
import { H5Levels_Commands } from "./H5Levels_Commands"
import { InfiniteLevels_Commands } from "./InfiniteLevels_Commands"

export const Levels_Commands: {
    [key: string]: { [key: string]: string[] }
} = {
    HCELevels: HCELevels_Commands,
    H2Levels: H2Levels_Commands,
    H2MCCLevels: H2MCCLevels_Commands,
    H3Levels: H3Levels_Commands,
    ODSTLevels: ODSTLevels_Commands,
    ReachLevels: ReachLevels_Commands,
    H4Levels: H4Levels_Commands,
    H5Levels: H5Levels_Commands,
    InfiniteLevels: InfiniteLevels_Commands,
}
