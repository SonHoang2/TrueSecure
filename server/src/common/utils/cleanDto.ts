export function cleanDto(dto: object, excludeFields: string[]): object {
    return Object.fromEntries(
        Object.entries(dto).filter(([key]) => !excludeFields.includes(key)),
    );
}
