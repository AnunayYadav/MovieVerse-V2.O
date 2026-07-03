function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomUserAgent(
    deviceType?: string,
    browserType?: string
): string {
    const devices = ['android', 'windows', 'ubuntu'];
    const browsers = ['chrome', 'firefox'];

    if (!deviceType) {
        deviceType = getRandomElement(devices);
    }

    if (!browserType) {
        browserType = getRandomElement(browsers);
    }

    let browserVersion: string;
    if (browserType === 'chrome') {
        const majorVersion = Math.floor(Math.random() * (127 - 110) + 110);
        const minorVersion = Math.floor(Math.random() * 10);
        const buildVersion = Math.floor(Math.random() * (10000 - 1000) + 1000);
        const patchVersion = Math.floor(Math.random() * 100);
        browserVersion = `${majorVersion}.${minorVersion}.${buildVersion}.${patchVersion}`;
    } else {
        const firefoxVersions = Array.from({ length: 10 }, (_, i) => 90 + i);
        browserVersion = getRandomElement(firefoxVersions).toString();
    }

    if (deviceType === 'windows') {
        const windowsVersions = ['10.0', '11.0'];
        const windowsVersion = getRandomElement(windowsVersions);
        if (browserType === 'chrome') {
            return `Mozilla/5.0 (Windows NT ${windowsVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`;
        } else {
            return `Mozilla/5.0 (Windows NT ${windowsVersion}; Win64; x64; rv:${browserVersion}.0) Gecko/${browserVersion}.0 Firefox/${browserVersion}.0`;
        }
    } else if (deviceType === 'ubuntu') {
        const ubuntuVersions = ['20.04', '22.04'];
        const ubuntuVersion = getRandomElement(ubuntuVersions);
        if (browserType === 'chrome') {
            return `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:94.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`;
        } else {
            return `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${browserVersion}.0) Gecko/${browserVersion}.0 Firefox/${browserVersion}.0`;
        }
    }

    return '';
}
