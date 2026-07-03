export interface FshareResponse {
    data: Data;
    status: string;
}

export interface Data {
    file: File;
}

export interface File {
    sources: FshareSource[];
    backups: FshareSource[];
    alternatives: FshareSource[][];
    downloads: Download[];
    vast: number;
}

export interface FshareSource {
    src: string;
    label: string;
    type: string;
    quality: any;
    storage: string;
    id: string;
    selected?: boolean;
}

export interface Download {
    src: string;
    label: string;
}
