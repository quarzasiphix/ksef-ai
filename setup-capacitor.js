// setup-capacitor.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Runs a shell command synchronously and exits the script if it fails.
 * @param {string} command The command to execute.
 */
const runCommand = (command) => {
    try {
        console.log(`\n--- Executing: ${command} ---`);
        execSync(command, { stdio: 'inherit' }); // 'inherit' shows command output in real-time
    } catch (error) {
        console.error(`\n--- Error executing command: ${command} ---`);
        // console.error(error); // You can uncomment this for more detailed error info
        process.exit(1); // Exit the script with a failure code
    }
};

/**
 * Reads capacitor.config.ts and ensures the webDir property is set to 'dist'.
 */
const ensureWebDirIsDist = () => {
    const configFileName = 'capacitor.config.ts';
    const configPath = path.resolve(process.cwd(), configFileName);

    if (!fs.existsSync(configPath)) {
        console.error(`\n--- Error: ${configFileName} not found. ---`);
        console.error('Make sure "npx cap init" was run successfully before this step.');
        process.exit(1);
    }

    console.log(`\n--- Checking ${configFileName} ---`);
    let configContent = fs.readFileSync(configPath, 'utf8');

    // Regex to find webDir: '...' or webDir: "..." with optional spaces
    const webDirRegex = /webDir:\s*['"]([^'"]*)['"]/;
    const match = configContent.match(webDirRegex);

    if (match) {
        const currentWebDir = match[1];
        if (currentWebDir === 'dist') {
            console.log(`webDir is already set to 'dist'. No changes needed.`);
        } else {
            console.log(`Found webDir: '${currentWebDir}'. Updating to 'dist'.`);
            configContent = configContent.replace(webDirRegex, `webDir: 'dist'`);
            fs.writeFileSync(configPath, configContent, 'utf8');
            console.log(`${configFileName} updated successfully.`);
        }
    } else {
        // If webDir is not found, try adding it simply. This assumes a basic config structure.
        console.warn(`webDir property not found in ${configFileName}. Attempting to add it.`);
        // Look for the end of the main config object '};'
        const configObjectEndRegex = /const\s+config.*=\s*\{([\s\S]*?)\};/;
        const configMatch = configContent.match(configObjectEndRegex);

        if (configMatch) {
            let configObjectContent = configMatch[1].trim();
            // Add webDir if it's not there. Add a comma if needed.
            if (!configObjectContent.includes('webDir:')) {
                 if (configObjectContent.endsWith(',')) {
                     configObjectContent += `\n  webDir: 'dist'\n`;
                 } else if(configObjectContent) { // Add comma if object wasn't empty
                     configObjectContent += `,\n  webDir: 'dist'\n`;
                 } else { // Object was empty
                     configObjectContent += `\n  webDir: 'dist'\n`;
                 }
                 configContent = configContent.replace(configObjectEndRegex, `const config = {${configObjectContent}};`);
                 fs.writeFileSync(configPath, configContent, 'utf8');
                 console.log(`Added webDir: 'dist' to ${configFileName}.`);
            } else {
                 console.warn(`webDir property was not matched by regex but seems to exist. Manual check might be needed.`);
            }

        } else {
             console.error(`Could not find the config object structure in ${configFileName} to add webDir. Manual addition required.`);
             process.exit(1);
        }
    }
};

// --- Main Script Steps ---

console.log('--- Starting Vite to Capacitor Android Setup ---');

// 1. Install dependencies
console.log('\n--- Step 1: Installing Capacitor dependencies ---');
runCommand('npm install @capacitor/core');
runCommand('npm install @capacitor/cli @capacitor/android --save-dev');

// 2. Run Vite build
console.log('\n--- Step 2: Building the Vite project ---');
runCommand('npm run build'); // Assumes 'build' script exists in package.json

// 3. Initialize Capacitor (if config doesn't exist)
console.log('\n--- Step 3: Initializing Capacitor (if needed) ---');
const capacitorConfigPath = path.resolve(process.cwd(), 'capacitor.config.ts');
if (!fs.existsSync(capacitorConfigPath)) {
    // Try to get app name and ID from package.json for non-interactive init
    let appName = 'MyApp'; // Default App Name
    let appId = 'com.example.myapp'; // Default App ID
    try {
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            appName = packageJson.name || appName;
            // Basic sanitization for package ID
            const sanitizedName = appName.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() || 'example';
            appId = `com.${sanitizedName}.app`;
            console.log(`Using App Name: "${appName}" and App ID: "${appId}" from package.json`);
        } else {
            console.log('package.json not found, using default App Name and ID.');
        }
    } catch (e) {
        console.warn('Could not read or parse package.json, using default App Name and ID.', e);
    }
    // Execute cap init with fetched/default values
    runCommand(`npx cap init "${appName}" "${appId}"`);
} else {
    console.log('Capacitor already initialized (capacitor.config.ts found). Skipping init.');
}

// 4. Ensure webDir is 'dist' in capacitor.config.ts
console.log('\n--- Step 4: Ensuring webDir is set to "dist" ---');
ensureWebDirIsDist();


// 5. Add Android platform
console.log('\n--- Step 5: Adding Android platform ---');
runCommand('npx cap add android');

// 6. Sync Capacitor
console.log('\n--- Step 6: Syncing Capacitor project ---');
runCommand('npx cap sync android');

console.log('\n--------------------------------------------------');
console.log('✅ Capacitor Android setup script completed successfully!');
console.log('\nNext steps suggestion:');
console.log('  - Open the native Android project: npx cap open android');
console.log('  - Build and run the app from within Android Studio.');
console.log('--------------------------------------------------');