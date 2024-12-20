import ISO6391 from 'iso-639-1';

/**
 * Main handler function for the API endpoint
 * @param req - Request object containing options
 * @returns Promise<string> - JSON string of model data
 */
export default async function main(req: Request): Promise<string> {

    const codes = ISO6391.getAllCodes();
    const list = codes.map(code => ({
        title: ISO6391.getNativeName(code),
        value: code,
    }));

    return JSON.stringify(list);
}
