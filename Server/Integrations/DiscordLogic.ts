export interface LeaderboardUser {
    Username: string
    UserId?: string
    Platform: string
    Score?: number
}

/**
 * Escapes Discord markdown special characters in text.
 */
export function escapeDiscordMarkdown(text: string): string {
    return text.replace(/(\*|_|`|~|\\)/g, "\\$1")
}

/**
 * Builds a formatted leaderboard message string.
 * Filters users by platform, sorts by score descending, and formats as numbered list.
 */
export function buildLeaderboardMessage(
    leaderboard: LeaderboardUser[],
    platform: string,
    title: string,
    maxUsers: number = 50
): string {
    const filteredUsers = leaderboard
        .filter((user) => user.Platform === platform)
        .sort(
            (firstItem, secondItem) =>
                (secondItem.Score ?? 0) - (firstItem.Score ?? 0)
        )

    const userCount = Math.min(filteredUsers.length, maxUsers)

    let body = ""
    for (let i = 0; i < userCount; i++) {
        body += `${i + 1} - ${filteredUsers[i].Username}: ${
            filteredUsers[i].Score
        }pts\n`
    }

    return `**${title}**\n\n${escapeDiscordMarkdown(body)}`
}
