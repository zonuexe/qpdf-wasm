const statusLabel = document.querySelector('[data-status]');
const logArea = document.querySelector('[data-log]');
const dropArea = document.querySelector('[data-drop]');
const fileInput = document.querySelector('[data-file-input]');
const runButton = document.querySelector('[data-run]');
const downloadLink = document.querySelector('[data-download]');
const fileNameSpan = document.querySelector('[data-filename]');
const recompressToggle = document.querySelector('[data-recompress]');

let selectedFile = null;
let moduleReadyResolve;
let moduleReadyReject;
const moduleReady = new Promise((resolve, reject) => {
  moduleReadyResolve = resolve;
  moduleReadyReject = reject;
});

// Configure Module before qpdf.js loads
window.Module = {
  noInitialRun: true,
  locateFile(path, prefix) {
    // qpdf.js sits in ./out/, wasm is alongside
    return `${prefix || ''}${path}`;
  },
  onRuntimeInitialized() {
    appendLog('qpdf wasm ready.');
    moduleReadyResolve(Module);
  },
  print: (text) => appendLog(text),
  printErr: (text) => appendLog(text),
};

function appendLog(text) {
  logArea.value += `${text}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

function setStatus(text) {
  statusLabel.textContent = text;
}

function setBusy(isBusy) {
  runButton.disabled = isBusy || !selectedFile;
  fileInput.disabled = isBusy;
  recompressToggle.disabled = isBusy;
  dropArea.dataset.busy = isBusy ? 'true' : 'false';
}

function selectFile(file) {
  selectedFile = file;
  fileNameSpan.textContent = file ? file.name : 'ファイル未選択';
  runButton.disabled = !file;
  downloadLink.classList.add('hidden');
  logArea.value = '';
}

async function runQdf() {
  if (!selectedFile) return;
  setBusy(true);
  setStatus('コンパイル中...');
  try {
    const mod = await moduleReady;
    const FS = mod.FS || globalThis.FS;
    await ensureWorkDir(FS);

    const inputPath = `/work/in.pdf`;
    const qdfPath = `/work/qdf.pdf`;
    const outputPath = `/work/out.pdf`;
    const finalSuffix = recompressToggle.checked ? '-optimized' : '-qdf';
    [inputPath, qdfPath, outputPath].forEach((p) => {
      try {
        FS.unlink(p);
      } catch (_) {}
    });
    FS.writeFile(inputPath, new Uint8Array(await selectedFile.arrayBuffer()));

    const invoke = mod.callMain || globalThis.callMain;
    if (!invoke) {
      throw new Error('qpdf entrypoint not found');
    }

    setStatus('qpdf 実行中 (--qdf) ...');
    const args = ['--qdf'];
    args.push(inputPath, recompressToggle.checked ? qdfPath : outputPath);
    invoke(args);

    if (recompressToggle.checked) {
      setStatus('再圧縮中 (最高レベル) ...');
      const compressArgs = [
        '--stream-data=compress',
        '--object-streams=generate',
        '--recompress-flate',
        '--compression-level=9',
        qdfPath,
        outputPath,
      ];
      invoke(compressArgs);
    }

    const outData = FS.readFile(outputPath);
    const blob = new Blob([outData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `${stripExtension(selectedFile.name)}${finalSuffix}.pdf`;
    downloadLink.classList.remove('hidden');
    setStatus('完了! 下のリンクからダウンロードできます');
  } catch (err) {
    console.error(err);
    appendLog(`エラー: ${err?.message || err}`);
    setStatus('エラーが発生しました。ログを確認してください。');
  } finally {
    setBusy(false);
  }
}

async function ensureWorkDir(FS) {
  try {
    FS.stat('/work');
  } catch (_) {
    FS.mkdir('/work');
  }
}

function stripExtension(name) {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

function handleFiles(files) {
  if (!files || !files.length) return;
  selectFile(files[0]);
}

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragging');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('dragging');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragging');
  handleFiles(e.dataTransfer.files);
});

dropArea.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

runButton.addEventListener('click', () => {
  if (!selectedFile) return;
  runQdf();
});

document.addEventListener('DOMContentLoaded', () => {
  setStatus('WASM 初期化中...');
  runButton.disabled = true;
});
