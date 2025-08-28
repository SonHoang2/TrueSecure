export interface OnlineStatus {
    onlineDevices: Record<string, Record<string, string>>;
    lastSeen: Record<string, string>;
}
