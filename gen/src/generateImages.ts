// generate.ts
import chalk from 'chalk'
import { execFileSync } from 'child_process'
import dotenv from 'dotenv'
import fs from 'fs-extra'
import path from 'path'
import { FigmaDocument, IconFontData, IconMapper } from './interfaces'


// Load environment variables
dotenv.config()
//Retrieve Figma Access Token and Canvas from .env file
const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN
const FIGMA_CANVAS_URL = process.env.FIGMA_CANVAS_URL

// Validate required environment variables
if (!FIGMA_API_TOKEN || !FIGMA_CANVAS_URL) {
    console.error(
        chalk.red('-> Missing required environment variables. Please check your .env file.')
    )
    process.exit(1)
}

const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms))

const filesToDelete: string[] = []

const graphQLDir = path.resolve(__dirname, 'GraphQL')
fs.ensureDirSync(graphQLDir)
const tempFilePath = path.resolve(graphQLDir, 'figma_response.json')
const pngImagesUrlsPath = path.resolve(graphQLDir, 'pngImagesUrl.json')
const svgImagesUrlsPath = path.resolve(graphQLDir, 'svgImagesUrl.json')
const mapperFilePath = path.resolve(graphQLDir, 'mapper.json')
filesToDelete.push(mapperFilePath)
filesToDelete.push(tempFilePath)
filesToDelete.push(pngImagesUrlsPath)
filesToDelete.push(svgImagesUrlsPath)
const iconMapper: IconMapper = {}

try {
    ; (async () => {
        try {
            console.log(chalk.blueBright('1. Using curl to fetch data from Figma API...'))

            // Create environment variables object for curl that preserves proxy settings
            const execEnvironment = { ...process.env }

            // Enhanced curl command with progress display and file output
            const curlCommand = `curl -s -o "${tempFilePath}" -H "X-Figma-Token: ${FIGMA_API_TOKEN}" "${FIGMA_CANVAS_URL}"`

            //// Uncomment the following lines to debug

            // console.log(chalk.blue('-> Executing curl command with proxy settings:'));
            // console.log(chalk.blue('   HTTP_PROXY:'), execEnvironment.HTTP_PROXY || 'not set');
            // console.log(chalk.blue('   HTTPS_PROXY:'), execEnvironment.HTTPS_PROXY || 'not set');
            // console.log(chalk.blue('   NO_PROXY:'), execEnvironment.NO_PROXY);
            // console.log(chalk.blue('   Output file:'), tempFilePath);
            // console.log(chalk.blue('   Command:'), curlCommand);

            // Execute curl with inherit stdio to show real-time progress
            try {
                execFileSync(
                    'curl',
                    [
                        '-s',
                        '-o',
                        tempFilePath,
                        '-H',
                        `X-Figma-Token: ${FIGMA_API_TOKEN}`,
                        FIGMA_CANVAS_URL
                    ],
                    {
                        timeout: 120000,
                        env: execEnvironment
                    }
                )
            } catch (error) {
                console.error(chalk.red('   Error fetching data from Figma API:'), error)
                throw error
            }

            // Read from file
            console.log(chalk.blueBright('2. Reading response from file...'))
            const fileData = fs.readFileSync(tempFilePath, 'utf-8')

            // Parse the JSON response
            const fullData = JSON.parse(fileData)
            const { document } = fullData
            const data: IconFontData = { document }
            fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2))
            console.log(chalk.green('   Successfully parsed JSON data'))
            console.log(chalk.gray('   Data size:'), Math.round(fileData.length / 1024), 'KB')
            console.log(chalk.gray('   Data structure:'), Object.keys(data).join(', '))
            const figmaUrlParts = FIGMA_CANVAS_URL.split('/')
            const figmaFileKey = figmaUrlParts[figmaUrlParts.length - 1].split('?')[0]
            const figmaDocumentId =
                figmaUrlParts[figmaUrlParts.length - 1].split('?')[1]?.split('=')[1] || null

            if (!figmaDocumentId) {
                console.error(chalk.red('   Error: Document ID not found in the URL'))
                process.exit(1)
            }

            //Images download URLs
            console.log(chalk.blueBright('3. Creating Images download PNG URLs'))
            const allPNGImageUrls = await getImageUrls(
                data,
                'png',
                figmaFileKey,
                figmaDocumentId,
                execEnvironment,
                pngImagesUrlsPath
            )
            console.log(chalk.blueBright('4. Creating Images download SVG URLs'))
            const allSVGImageUrls = await getImageUrls(
                data,
                'svg',
                figmaFileKey,
                figmaDocumentId,
                execEnvironment,
                svgImagesUrlsPath
            )

            // Download images
            console.log(chalk.blueBright('5. Downloading PNG icons'))
            await downloadImages(allPNGImageUrls, data, execEnvironment, 'png')
            console.log(chalk.blueBright('6. Downloading SVG icons'))
            await downloadImages(allSVGImageUrls, data, execEnvironment, 'svg')

            // Clean up temporary files, comment this to debug.
            console.log(chalk.blueBright(`7. Deleted temporary files.`))
            filesToDelete.forEach((file) => {
                try {
                    fs.unlinkSync(file)
                    console.log(chalk.gray(`   Deleted temporary file: ${file}`))
                } catch (err) {
                    console.error(chalk.red(`   Error deleting file ${file}:`), err)
                }
            })

            console.log(chalk.greenBright('🏆 Done!'))
        } catch (err: any) {
            console.error(chalk.red('   Error:'), err.message)
            process.exit(1)
        }
    })()
} catch (error) {
    console.error(chalk.red('   Unexpected error:'), error)
    process.exit(1)
}
async function getImageUrls(
    data: IconFontData,
    imageType: string,
    figmaFileKey: string,
    figmaDocumentId: string,
    execEnvironment: any,
    fileName: string
) {
    let allImageUrls = {}
    const iconKeysArray: string[] = []

    const canvasDocument = Array.isArray(data.document.children)
        ? data.document.children.find((doc) => doc.id === figmaDocumentId)
        : undefined

    console.log(chalk.yellow(`    Looking for icons in node-id ${figmaDocumentId}`))
    if (canvasDocument) {
        canvasDocument.children.forEach((group: FigmaDocument) => {
            if (group.type === 'GROUP') {
                group.children.forEach((componentSet: FigmaDocument) => {
                    if (componentSet.type === 'COMPONENT_SET') {
                        const iconName = componentSet.name
                        componentSet.children.forEach((component: FigmaDocument) => {
                            if (component.type === 'COMPONENT') {
                                const variant = component.name
                                    .replace('font-weight=', '')
                                    .toLowerCase()
                                component.children.forEach((icon: FigmaDocument) => {
                                    if (icon.type === 'VECTOR') {
                                        const iconId = icon.id
                                        iconKeysArray.push(iconId)
                                        iconMapper[iconId] = {
                                            name: iconName,
                                            variant: variant
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })

        fs.writeFileSync(mapperFilePath, JSON.stringify(iconMapper, null, 2))

        console.log(chalk.yellow(`    Found ${iconKeysArray.length} icons`))
        // Get Figma file key from the URL
        console.log(chalk.gray('    Using Figma file key:'), figmaFileKey)

        // Batch process the icons - X icons per request
        const BATCH_SIZE = 400
        const batches = []

        // Split iconKeysArray into batches
        for (let i = 0; i < iconKeysArray.length; i += BATCH_SIZE) {
            batches.push(iconKeysArray.slice(i, i + BATCH_SIZE))
        }

        console.log(chalk.yellow(`    Split download into ${batches.length} ${imageType} batches`))

        // Process each batch
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]
            const batchKeysString = batch.join(',')

            console.log(
                chalk.gray(
                    `    Processing  ${imageType} batch ${i + 1}/${batches.length} (${batch.length
                    } icons)`
                )
            )

            // Create a temporary file for this batch
            const batchFilePath = path.resolve(graphQLDir, `batch_${imageType}_${i + 1}.json`)
            filesToDelete.push(batchFilePath)

            const curlImagesURLCommand = `curl -s -o "${batchFilePath}" -H "X-Figma-Token: ${FIGMA_API_TOKEN}" "https://api.figma.com/v1/images/${figmaFileKey}?ids=${batchKeysString}&format=${imageType}"`

            console.log(chalk.yellow(`    Downloading URLs for ${imageType} batch ${i + 1}`))
            // Execute curl with inherit stdio to show real-time progress
            try {
                execFileSync(
                    'curl',
                    [
                        '-s',
                        '-o',
                        batchFilePath,
                        '-H',
                        `X-Figma-Token: ${FIGMA_API_TOKEN}`,
                        `https://api.figma.com/v1/images/${figmaFileKey}?ids=${batchKeysString}&format=${imageType}`
                    ],
                    {
                        timeout: 120000,
                        env: execEnvironment
                    }
                )

                // Read and process the batch response
                const batchData = JSON.parse(fs.readFileSync(batchFilePath, 'utf-8'))

                // Merge image URLs
                if (batchData && batchData.images) {
                    allImageUrls = { ...allImageUrls, ...batchData.images }
                    console.log(
                        chalk.green(`    Successfully got URLs for ${imageType} batch ${i + 1}`)
                    )
                } else {
                    console.error(
                        chalk.red(`    Batch ${i + 1} response doesn't contain image URLs`)
                    )
                }
            } catch (err) {
                console.error(chalk.red(`    Error downloading batch ${i + 1}:`), err)
            }

            // Add a small delay between batches to avoid rate limiting
            if (i < batches.length - 1) {
                console.log(
                    chalk.gray(`    ⌛ Waiting 2 seconds before next ${imageType} batch...`)
                )
                await delay(2000)
            }
        }

        // Save all image URLs to a single file
        fs.writeFileSync(fileName, JSON.stringify({ images: allImageUrls }, null, 2))
        console.log(
            chalk.gray(`    Got URLs for ${Object.keys(allImageUrls).length} ${imageType} icons`)
        )
        console.log(chalk.gray(`    All ${imageType} image URLs saved to ${fileName}`))
        return allImageUrls
    } else {
        console.error(
            chalk.red(`    Error: Document with ID ${figmaDocumentId} not found in the response`)
        )
        return allImageUrls
    }
}

async function downloadImages(
    allImageUrls: any,
    data: IconFontData,
    execEnvironment: any,
    imageType: string
) {
    const totalIcons = Object.keys(allImageUrls).length
    let currentIcon = 0

    for (const [ImageID, ImageUrl] of Object.entries(allImageUrls) as [string, string][]) {
        const ImageFileName = iconMapper[ImageID].name + '.' + imageType || null
        const variant = iconMapper[ImageID].variant || null

        if (ImageFileName !== null && variant !== null) {
            const folder = path.resolve(__dirname, 'icons', `${imageType}s`, variant)
            console.log(
                chalk.gray(
                    `    Downloading Image: ${ImageFileName} ${variant}  (${currentIcon + 1
                    }/${totalIcons})`
                )
            )

            // Create Image directory if it doesn't exist
            fs.ensureDirSync(folder)

            const outputFilePath = path.join(folder, ImageFileName)
            try {
                execFileSync(
                    'curl',
                    [
                        '-s',
                        '-o',
                        outputFilePath,
                        ImageUrl.toString()
                    ],
                    {
                        timeout: 30000,
                        env: execEnvironment
                    }
                )
            } catch (error) {
                console.error(chalk.red(`    Error downloading ${ImageFileName}:`), error)
            }
        } else {
            console.error(
                chalk.underline.yellow(
                    `    Warning: ImageFileName or variant is undefined for ImageID: ${ImageID}`
                )
            )
        }

        currentIcon++
    }
    console.log(chalk.green(`    All ${currentIcon} ${imageType} images were downloaded`))
}
