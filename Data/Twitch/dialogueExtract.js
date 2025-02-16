text = `





`

// Function to extract dialogue lines
function extractDialogue(text) {
    const lines = text.split("\n")
    const dialoguePattern = /^\s*([^:]+)\s*\(?(COM)?\)?:\s*"([^"]+)"/
    const dialogues = []

    lines.forEach((line) => {
        const match = line.match(dialoguePattern)
        if (match) {
            const speaker = match[1].trim()
            const dialogue = match[3].trim()
            dialogues.push(`"${dialogue}" - ${speaker},`)
        }
    })

    return dialogues
}

const dialogueList = extractDialogue(text)
dialogueList.forEach((line) => console.log(line))
