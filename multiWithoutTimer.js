const puppeteer = require('puppeteer');
const fs = require('fs');

// Function to get the current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    return `${now.toISOString()} -`;
}

// Function to log the HTML content of the page
async function logDOMContent(page, stage) {
    const domContent = await page.content();
    const timestamp = getCurrentTimestamp();
    fs.writeFileSync(`dom_${stage}_${timestamp}.html`, domContent);
    console.log(`${timestamp} Logged DOM content for stage: ${stage}`);
}

// Function to take a screenshot for debugging
async function takeScreenshot(page, stage) {
    const timestamp = getCurrentTimestamp();
    await page.screenshot({ path: `screenshot_${stage}_${timestamp}.png` });
    console.log(`${timestamp} Screenshot taken for stage: ${stage}`);
}

// Function to perform Google search and handle links for a single query
async function performGoogleSearch(query) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Go to Google and wait until the page is fully loaded
        await page.goto('https://www.google.be', { waitUntil: 'networkidle2' });

        // Log the DOM after initial page load
        await logDOMContent(page, 'after_initial_load');


        try {
            await page.evaluate(() => {
                const consentButton = document.evaluate(
                    "//button[@id='L2AGLb']",
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;

                if (consentButton) {
                    consentButton.click();
                    console.log("Accepted cookies consent");
                } else {
                    console.log("Consent button not found");
                }
            });
        } catch (error) {
            console.log("Cookies consent modal did not appear or could not be clicked", error);
            await page.screenshot({ path: 'modal_issue.png' });  // Take a screenshot for debugging
        }

        // Retry logic for finding the search input field
        const inputSelector = '#APjFqb';
        const maxRetries = 3;
        let found = false;

        for (let i = 0; i < maxRetries; i++) {
            try {
                await page.waitForSelector(inputSelector, { visible: true, timeout: 30000 });
                found = true;
                break; // Exit the loop if the selector is found
            } catch (err) {
                console.log(`${getCurrentTimestamp()} Retry ${i + 1}: Failed to find the input field.`);
                await takeScreenshot(page, `retry_${i + 1}`);
                await logDOMContent(page, `retry_${i + 1}`);
            }
        }

        if (!found) {
            throw new Error('Failed to find the search input field after multiple retries.');
        }
        await page.screenshot({ path: 'search-keys.png' });  // Take a screenshot for debugging
        // Proceed with the search
        await page.type(inputSelector, query);

        // Log the current value of the search input to ensure it's correct
        const inputValue = await page.evaluate(selector => document.querySelector(selector).value, inputSelector);
        console.log(`${getCurrentTimestamp()} Search input value: "${inputValue}"`);

        if (inputValue !== query) {
            console.error(`${getCurrentTimestamp()} Error: The query "${query}" was not correctly typed into the search input!`);
            fs.appendFileSync('logfile.log', `${getCurrentTimestamp()} Error: The query "${query}" was not correctly typed into the search input!\n`);
            return;
        }

        await page.keyboard.press('Enter');

        // Wait for the results to load
        await page.waitForSelector('h3 a', { timeout: 60000 }); // Increase timeout to 60 seconds

        // Log the DOM after search results load
        await logDOMContent(page, 'after_search_results');

        // Get all links on the first page, excluding those containing "sca_esv" or "ved" in the URL
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => a.href)
                .filter(href => href && !href.includes('sca_esv') && !href.includes('ved') && !href.includes('videmaisonsbruxelles'));
        });

        // Log filtered links with timestamp
        const timestamp = getCurrentTimestamp();
        console.log(`${timestamp} Filtered links for query "${query}":`, links);
        fs.appendFileSync('logfile.log', `${timestamp} Filtered links for query "${query}": ${links.join(', ')}\n`);

        // Open each filtered link in a new tab
        for (const link of links) {
            const newPage = await browser.newPage();
            await newPage.goto(link, { waitUntil: 'domcontentloaded' });
            console.log(`${timestamp} Opened: ${link}`);

            await newPage.close();
        }

    } catch (error) {
        const timestamp = getCurrentTimestamp();
        console.error(`${timestamp} An error occurred for query "${query}":`, error);
        fs.appendFileSync('logfile.log', `${timestamp} Error for query "${query}": ${error.message}\n`);
    } finally {
        await browser.close();
    }
}

// Function to handle multiple queries
async function performMultipleSearches(queries) {
    for (const query of queries) {
        await performGoogleSearch(query);
    }
}

// Execute the searches
const searchQueries = [
    'vide maison',
    'vide grenier',
    'vide maisons bruxelles',
    'vide grenier bruxelles',
    'vide Maison Bruxelles Vide Grenier',
    'vide appartement',
    'vide appartement bruxelles',
    'vide tout bruxelles',
];

performMultipleSearches(searchQueries).catch(err => {
    const timestamp = getCurrentTimestamp();
    fs.appendFileSync('logfile.log', `${timestamp} Error during execution: ${err.message}\n`);
});
