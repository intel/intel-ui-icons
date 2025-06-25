const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const distFolder = 'dist.web'

//Verify if the distFolder folder exists, if not create it
fs.ensureDirSync(distFolder)

const elementsToCopy = ['LICENSE.md', 'README.md', 'package.json', 'CHANGELOG.md']

elementsToCopy.forEach((element) => {
    if (fs.existsSync(element)) {
        console.log(`Copying ${element}...`)
        fs.copySync(element, path.join(distFolder, element))
        console.log(`Copied: ${element} -> dist/${element}`)
    } else {
        console.warn(`Warning: ${element} does not exist and will not be copied.`)
    }
})

console.log('Build completed successfully!')
