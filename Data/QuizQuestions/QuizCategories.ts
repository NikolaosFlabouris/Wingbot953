import { halo1Questions } from "./HaloCE"
import { halo2Questions } from "./Halo2"
import { halo3Questions } from "./Halo3"
import { odstQuestions } from "./Halo3ODST"
import { reachQuestions } from "./HaloReach"
import { halo4Questions } from "./Halo4"
import { halo5Questions } from "./Halo5"
import { infiniteQuestions } from "./HaloInfinite"
import { franchiseQuestions } from "./HaloFranchise"
import { halorunsQuestions } from "./HalorunsSpeedrunning"
import { haloWars } from "./HaloWars"
import { haloWars2 } from "./HaloWars2"

export const quizCategories = [
    {
        CategoryQuestions: halo1Questions,
        CategoryName: "Halo: CE",
        CategoryLength: halo1Questions.length,
    },
    {
        CategoryQuestions: halo2Questions,
        CategoryName: "Halo 2",
        CategoryLength: halo2Questions.length,
    },
    {
        CategoryQuestions: halo3Questions,
        CategoryName: "Halo 3",
        CategoryLength: halo3Questions.length,
    },
    {
        CategoryQuestions: odstQuestions,
        CategoryName: "Halo 3:ODST",
        CategoryLength: odstQuestions.length,
    },
    {
        CategoryQuestions: reachQuestions,
        CategoryName: "Halo: Reach",
        CategoryLength: reachQuestions.length,
    },
    {
        CategoryQuestions: halo4Questions,
        CategoryName: "Halo 4",
        CategoryLength: halo4Questions.length,
    },
    {
        CategoryQuestions: halo5Questions,
        CategoryName: "Halo 5",
        CategoryLength: halo5Questions.length,
    },
    // {
    //     CategoryQuestions: infiniteQuestions,
    //     CategoryName: "Halo Infinite",
    //     CategoryLength: infiniteQuestions.length,
    // },
    {
        CategoryQuestions: haloWars,
        CategoryName: "Halo Wars 1",
        CategoryLength: haloWars.length,
    },
    {
        CategoryQuestions: haloWars2,
        CategoryName: "Halo Wars 2",
        CategoryLength: haloWars.length,
    },
    {
        CategoryQuestions: franchiseQuestions,
        CategoryName: "Halo Franchise",
        CategoryLength: franchiseQuestions.length,
    },
    {
        CategoryQuestions: halorunsQuestions,
        CategoryName: "HaloRuns/Speedrunning",
        CategoryLength: halorunsQuestions.length,
    },
]
