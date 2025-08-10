export function parseTimeToMilliseconds(timeString: string): number {
    const regex = /^(\d+)([hmsd])$/;
    const match = timeString.match(regex);

    if (!match) {
        throw new Error(`Invalid time format: ${timeString}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': // minutes
            return value * 60 * 1000;
        case 'h': // hours
            return value * 60 * 60 * 1000;
        case 'd': // days
            return value * 24 * 60 * 60 * 1000;
        case 's': // seconds
            return value * 1000;
        default:
            throw new Error(`Unsupported time unit: ${unit}`);
    }
}
