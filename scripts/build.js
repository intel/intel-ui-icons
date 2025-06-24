const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const distFolder = 'dist.web'

//Delete and create the dist directory
if (fs.existsSync(distFolder)) {
    console.log('Removing existing dist directory...')
    fs.removeSync(distFolder)
}
console.log('Creating dist directory...')
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
