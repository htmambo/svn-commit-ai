const vscode = require('vscode');
const cp = require('child_process');

function runSvn(args, cwd) {
  return new Promise((resolve, reject) => {
    cp.execFile(
      'svn',
      args,
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout))
    );
  });
}

// Prefer staged changelists-free diff of all modified files; fall back to status for unversioned files.
async function collectChanges(cwd) {
  const diff = await runSvn(['diff', '--git'], cwd);
  const status = await runSvn(['status'], cwd);
  const added = status
    .split('\n')
    .filter((l) => l.startsWith('?'))
    .map((l) => l.slice(1).trim());
  let out = diff;
  if (added.length) {
    out += `\n\nUnversioned files (not in diff):\n${added.join('\n')}\n`;
  }
  return out.trim();
}

function resolveRepo(arg) {
  // scm/title passes the SourceControl; fall back to the first workspace folder.
  const rootUri = arg && arg.rootUri;
  const inputBox = arg && arg.inputBox;
  const root = rootUri ? rootUri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return { root, inputBox };
}

async function pickModel(family) {
  const selector = { vendor: 'copilot' };
  if (family) selector.family = family;
  const models = await vscode.lm.selectChatModels(selector);
  return models[0];
}

async function generate(arg) {
  const { root, inputBox } = resolveRepo(arg);
  if (!root) {
    vscode.window.showErrorMessage('SVN Commit AI: no repository found.');
    return;
  }
  const cfg = vscode.workspace.getConfiguration('svnCommitAI');

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.SourceControl, title: 'Generating commit message…' },
    async (_p, token) => {
      let changes;
      try {
        changes = await collectChanges(root);
      } catch (e) {
        vscode.window.showErrorMessage(`SVN Commit AI: svn failed: ${e.message}`);
        return;
      }
      if (!changes) {
        vscode.window.showInformationMessage('SVN Commit AI: no changes to commit.');
        return;
      }
      const max = cfg.get('maxDiffChars', 60000);
      if (changes.length > max) {
        changes = changes.slice(0, max) + '\n…[diff truncated]';
      }

      const model = await pickModel(cfg.get('modelFamily', ''));
      if (!model) {
        vscode.window.showErrorMessage(
          'SVN Commit AI: no Copilot language model available. Sign in to GitHub Copilot first.'
        );
        return;
      }

      const prompt =
        `You write SVN commit messages. Language: ${cfg.get('language', '中文')}.\n` +
        `Style: ${cfg.get('style', '')}\n` +
        `Output ONLY the commit message text, no code fences, no explanations.\n\n` +
        `Changes:\n${changes}`;

      let text = '';
      try {
        const res = await model.sendRequest(
          [vscode.LanguageModelChatMessage.User(prompt)],
          {},
          token
        );
        for await (const chunk of res.text) {
          text += chunk;
          if (inputBox) inputBox.value = text;
        }
      } catch (e) {
        vscode.window.showErrorMessage(`SVN Commit AI: model request failed: ${e.message}`);
        return;
      }

      text = text.replace(/^```\w*\n?|\n?```$/g, '').trim();
      if (inputBox) {
        inputBox.value = text;
      } else {
        await vscode.env.clipboard.writeText(text);
        try {
          await vscode.commands.executeCommand('workbench.scm.focus');
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch {
          vscode.window.showInformationMessage('Commit message copied to clipboard.');
        }
      }
    }
  );
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('svnCommitAI.generate', generate));
}

function deactivate() {}

module.exports = { activate, deactivate };
