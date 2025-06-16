export interface FigmaDocument {
    id: string
    name: string
    type: string
    children: FigmaDocument[]
}

export interface IconFontData {
    document: {
        [id: string]: FigmaDocument
    }
}

export interface IconMapper {
    [key: string]: {
        name: string
        variant: string
    }
}
