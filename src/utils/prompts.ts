import * as readline from 'readline';

/**
 * Renders an interactive multiselect menu natively in the terminal.
 *
 * @param message The prompt question to ask the user.
 * @param options Array of options to select from.
 * @returns A promise resolving to an array of the selected values.
 */
export async function multiselect<T>(
  message: string,
  options: { label: string; value: T; checked?: boolean }[]
): Promise<T[]> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Make stdin emit keypress events and enter raw mode so we get every keystroke
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const items = options.map((opt) => ({ ...opt, checked: !!opt.checked }));
    let cursorIndex = 0;
    let linesRendered = 0;
    let submitted = false;

    const render = () => {
      // Clear previously rendered lines
      for (let i = 0; i < linesRendered; i++) {
        process.stdout.write('\x1b[1A\x1b[2K');
      }

      let output = `\x1b[36m?\x1b[0m ${message}\n`;
      output += `\x1b[90m  (Press <space> to select, <return> to submit)\x1b[0m\n`;

      items.forEach((item, i) => {
        const isSelected = i === cursorIndex;
        const pointer = isSelected ? '\x1b[36m❯\x1b[0m' : ' ';
        const checkbox = item.checked ? '\x1b[32m◉\x1b[0m' : '◯';
        const color = isSelected ? '\x1b[36m' : '';
        const reset = '\x1b[0m';
        output += `${pointer} ${checkbox} ${color}${item.label}${reset}\n`;
      });

      process.stdout.write(output);
      linesRendered = items.length + 2; // +1 for message, +1 for instructions
    };

    const cleanup = () => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKeypress);
      rl.close();
      process.stdout.write('\x1B[?25h'); // Show cursor again
    };

    const onKeypress = (str: string, key: any) => {
      // Abort on Ctrl+C or Escape
      if ((key.ctrl && key.name === 'c') || key.name === 'escape') {
        cleanup();
        process.stdout.write('\n\x1b[31m✖ Aborted.\x1b[0m\n');
        process.exit(1);
      }

      if (key.name === 'up') {
        cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : items.length - 1;
        render();
      } else if (key.name === 'down') {
        cursorIndex = cursorIndex < items.length - 1 ? cursorIndex + 1 : 0;
        render();
      } else if (key.name === 'space') {
        items[cursorIndex].checked = !items[cursorIndex].checked;
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        if (submitted) return;
        submitted = true;
        cleanup();
        process.stdout.write('\n'); // Move past the menu
        resolve(items.filter((i) => i.checked).map((i) => i.value));
      }
    };

    // Hide cursor for the menu
    process.stdout.write('\x1B[?25l');

    process.stdin.on('keypress', onKeypress);
    render(); // Initial render
  });
}
