const util = require("util")
const runApplescript = require("run-applescript")
const fs = require("fs").promises
const path = require("path")

const keepDir = process.argv[2]
const notebookLabels = process.argv.slice(3)
console.log(`Keep dir: ${keepDir}`)
console.log(`Notebook labels: ${util.inspect(notebookLabels)}`)

function createTag(tag) {
    return `
    if (not (tag named "${tag}" exists)) then
      make tag with properties {name:"${tag}"}
    end if
    `
}

function toNotebook(labels) {
    const notebook = notebookLabels.find(n => labels.includes(n))
    return notebook ? `notebook "${notebook}"` : ""
}

async function createNote(file) {
    console.log(`Processing note: ${file}`)
    const noteString = await fs.readFile(path.join(keepDir, file), {encoding: "utf-8"})
    const note = JSON.parse(noteString)
    const labels = note.labels.map(label => label.name)
    const tags = labels.filter(l => !notebookLabels.includes(l))
    const createTags = tags.map(createTag).join("")
    const tagsList = tags.map(t => `"${t}"`).join(", ")
    console.log(`Tags: ${tagsList}`)
    const noteText = JSON.stringify(note.textContent) // stringify() to escape quote characters
    const createNote = `set theNote to create note title "${note.title}" with text ${noteText} ` +
        `tags {${tagsList}} ${toNotebook(labels)}`
    const appleScript = `
        tell application "Evernote"
          ${createTags}
          ${createNote}
        end tell
        `
    await runApplescript(appleScript)
}

try {
    (async () => {
        const files = await fs.readdir(keepDir)
        fileLoop:
        for (const file of files) {
            if (!file.endsWith(".json")) {
                continue
            }
            for (let i = 0; i < 3; i++) {
                try {
                    await createNote(file)
                    continue fileLoop
                } catch (e) {
                    console.error(`Error processing note ${file}, retrying..`, e)
                }
            }
        }
    })()
} catch (e) {
    console.error(e)
}