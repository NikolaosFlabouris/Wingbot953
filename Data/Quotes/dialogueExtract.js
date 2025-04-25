text = `



`

// Function to extract dialogue lines
function extractDialogue(text) {
    const lines = text.split("\n")

    // Enhanced pattern to handle multiple formats:
    // 1. Name: "dialogue"
    // 2. Name (context): "dialogue"
    // 3. Name: (context) "dialogue"
    const dialoguePattern =
        /^\s*([^:()]+)(?:\s*\(([^)]+)\))?\s*:\s*(?:\(([^)]+)\))?\s*"([^"]+)"/

    const dialogues = []

    lines.forEach((line) => {
        const match = line.match(dialoguePattern)
        if (match) {
            const [_, speaker, contextBefore, contextAfter, dialogue] = match
            const context = contextBefore || contextAfter

            // Format the output with context if it exists
            const formattedLine = `"${dialogue}" - ${speaker.trim()}${
                context ? ` (${context})` : ""
            },`
            dialogues.push(formattedLine)
        }
    })

    return dialogues
}

const dialogueList = extractDialogue(text)
dialogueList.forEach((line) => console.log(line))
