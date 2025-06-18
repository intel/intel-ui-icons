const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')

// Create dist.web directory if it doesn't exist
fs.ensureDirSync('dist.web')

// Copy LICENSE.md file if it exists
if (fs.existsSync('LICENSE.md')) {
    console.log('Copying LICENSE.md file...')
    fs.copySync('LICENSE.md', 'dist.web/LICENSE.md')
    console.log('Copied: LICENSE.md -> dist.web/LICENSE.md')
}

// Copy README.md file if it exists
if (fs.existsSync('README.md')) {
    console.log('Copying README.md file...')
    fs.copySync('README.md', 'dist.web/README.md')
    console.log('Copied: README.md -> dist.web/README.md')
}

console.log('Build completed successfully!')
