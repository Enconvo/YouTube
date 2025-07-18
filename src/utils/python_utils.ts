import { CommandUtil, RunShellScriptParams, RunShellScriptResult } from "@enconvo/api";
import { spawn } from "child_process";

export interface RunProjectShellScriptParams {
    command: string
    projectPath?: string
    activeVenv?: boolean
    onData?: (data: string) => void;
    onError?: (data: string) => void;
    onPrint?: (data: string) => void;
}


export interface RunProjectPythonScriptParams {
    projectPath?: string
    pythonFile?: string
    params?: string[]
    onData?: (data: string) => void;
    onError?: (data: string) => void;
    onPrint?: (data: string) => void;
}


/**
 * Runs a Python script in the project directory using uv
 * @param paramsOrFile - Either a RunProjectPythonScriptParams object or a string representing the Python file path
 * @param params - Optional array of string parameters when first argument is a file path
 * @returns Promise resolving to the script execution result
 */
export function runProjectPythonScript(paramsOrFile: RunProjectPythonScriptParams | string, params?: string[]): Promise<RunShellScriptResult> {
    console.log('paramsOrFile', paramsOrFile, params)
    // If first argument is a string (file path), convert to object format
    if (typeof paramsOrFile === 'string') {
        return runProjectShellScript({
            command: `uv run ${paramsOrFile} ${params?.join(' ') || ''}`,
        });
    }

    // Handle the case where first argument is a params object
    return runProjectShellScript({
        ...paramsOrFile,
        command: `uv run ${paramsOrFile.pythonFile} ${paramsOrFile.params?.join(' ') || ''}`,
    });
}


export const runProjectShellScript = async (params: RunProjectShellScriptParams): Promise<RunShellScriptResult> => {
    /**
     * set project path
     */
    const projectPath = params.projectPath || CommandUtil.extensionPath()

    const command = `${params.activeVenv ? 'source .venv/bin/activate && ' : ''}${params.command}`;
    console.log('command', command, projectPath);

    const child = spawn("/bin/bash", ['-c', command], {
        cwd: projectPath
    });

    let output = '';
    let startOutputResult = false
    child.stdout.on('data', async (data) => {
        const chunk = data.toString();
        if (chunk.startsWith("enconvo://python.result")) {
            startOutputResult = true
            const result = chunk.split("enconvo://python.result")[1]
            output = result
        } else if (startOutputResult) {
            output += chunk
        }
        params.onData?.(chunk)
        params.onPrint?.(chunk)
    });

    child.stderr.on('data', (data) => {
        const chunk = data.toString();
        // console.log("error data:", chunk);
        output += chunk;
        params.onError?.(chunk)
        params.onPrint?.(chunk)
    });


    const result = await new Promise<{ code: number, output: string }>((resolve, reject) => {
        child.on('close', (code) => {
            console.log('close', code)
            resolve({
                code: code || 0,
                output
            });
        });
    });

    return result
}