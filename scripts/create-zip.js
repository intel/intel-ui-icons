const AdmZip = require('adm-zip')

async function createZipArchive(folderPath, outputPath) {
    try {
        const zip = new AdmZip()
        zip.addLocalFolder(folderPath) // Add the contents of the folder
        zip.writeZip(outputPath) // Save the zip file
        console.log(`Created ${outputPath} successfully`)
    } catch (e) {
        console.log(`Something went wrong. ${e}`)
    }
}

// Get arguments from command line, or use defaults
const folderPath = process.argv[2]
const outputPath = process.argv[3]

createZipArchive(folderPath, outputPath)
