declare module 'shellcheck' {
  export function shellcheck(options: { args: string[] }): Promise<{
    stdout: string | Buffer;
    stderr?: string | Buffer;
  }>;
}
