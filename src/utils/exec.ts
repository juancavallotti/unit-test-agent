import { exec } from "child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

/**
 * Run a command and return { stdout, stderr } (Node's custom promisify for exec).
 */
export async function runExec(
    command: string,
    options: { cwd: string }
): Promise<{ stdout: string; stderr: string }> {
    const { stdout, stderr } = await execPromise(command, options);
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
}
