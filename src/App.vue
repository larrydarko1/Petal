<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open, save, ask } from '@tauri-apps/plugin-dialog';

// State
const content = ref('');
const filePath = ref<string | null>(null);
const savedContent = ref('');
const isModified = computed(() => content.value !== savedContent.value);
let unlistenFileOpen: UnlistenFn | undefined;

const fileName = computed(() => {
    if (!filePath.value) return 'Untitled';
    const parts = filePath.value.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Untitled';
});

// Prompt user if there are unsaved changes, returns true if safe to proceed
async function confirmDiscard(): Promise<boolean> {
    if (!isModified.value) return true;
    return await ask('You have unsaved changes. Discard them?', {
        title: 'Unsaved Changes',
        kind: 'warning',
    });
}

// Load file content into editor
async function loadFileContent(path: string): Promise<void> {
    try {
        const text = await invoke<string>('read_text_file', { path });
        content.value = text;
        filePath.value = path;
        savedContent.value = text;
    } catch (err) {
        console.error('Failed to open file:', err);
    }
}

// File operations
async function newFile(): Promise<void> {
    if (!(await confirmDiscard())) return;
    content.value = '';
    filePath.value = null;
    savedContent.value = '';
}

async function openFile(): Promise<void> {
    if (!(await confirmDiscard())) return;

    const selected = await open({
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
    });
    if (!selected) return;

    await loadFileContent(selected as string);
}

async function saveFile(): Promise<void> {
    if (filePath.value) {
        try {
            await invoke('write_text_file', { path: filePath.value, content: content.value });
            savedContent.value = content.value;
        } catch (err) {
            console.error('Failed to save file:', err);
        }
    } else {
        await saveFileAs();
    }
}

async function saveFileAs(): Promise<void> {
    const selected = await save({
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        defaultPath: filePath.value ?? 'untitled.txt',
    });
    if (!selected) return;

    try {
        await invoke('write_text_file', { path: selected, content: content.value });
        filePath.value = selected;
        savedContent.value = content.value;
    } catch (err) {
        console.error('Failed to save file:', err);
    }
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    const key = e.key.toLowerCase();

    if (key === 'n') {
        e.preventDefault();
        newFile();
    } else if (key === 'o') {
        e.preventDefault();
        openFile();
    } else if (e.shiftKey && key === 's') {
        e.preventDefault();
        saveFileAs();
    } else if (key === 's') {
        e.preventDefault();
        saveFile();
    }
}

onMounted(async () => {
    window.addEventListener('keydown', handleKeydown);

    // Check for files opened via OS file association (cold start)
    try {
        const pending = await invoke<string[]>('get_pending_files');
        if (pending.length > 0) {
            await loadFileContent(pending[0]);
        }
    } catch (err) {
        console.error('Failed to get pending files:', err);
    }

    // Listen for files opened while app is already running (warm start)
    unlistenFileOpen = await listen<string>('open-file', async (event) => {
        if (!(await confirmDiscard())) return;
        await loadFileContent(event.payload);
    });
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    unlistenFileOpen?.();
});
</script>

<template>
    <div class="notepad">
        <header class="toolbar" data-tauri-drag-region>
            <div class="file-info">
                <span v-if="isModified" class="modified-dot" />
                <span class="file-name">{{ fileName }}</span>
            </div>
            <nav class="actions">
                <button title="New file (⌘N)" @click="newFile">new</button>
                <button title="Open file (⌘O)" @click="openFile">open</button>
                <button title="Save file (⌘S)" @click="saveFile">save</button>
                <button title="Save as (⌘⇧S)" @click="saveFileAs">save as</button>
            </nav>
        </header>
        <textarea v-model="content" class="editor" placeholder="Start typing..." spellcheck="false" />
    </div>
</template>

<style scoped lang="scss">
@use './style.scss' as *;

.notepad {
    display: flex;
    flex-direction: column;
    height: 100vh;

    .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        height: $toolbar-height;
        min-height: $toolbar-height;
        border-bottom: 1px solid var(--border);
        background: var(--bg-toolbar);
        user-select: none;
        -webkit-user-select: none;

        .file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;

            .modified-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--dot-modified);
                flex-shrink: 0;
            }

            .file-name {
                font-family: $font-stack;
                font-size: 12px;
                font-weight: 500;
                letter-spacing: 0.02em;
                color: var(--text-secondary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }

        .actions {
            display: flex;
            gap: 2px;

            button {
                background: none;
                border: none;
                padding: 4px 10px;
                border-radius: $btn-radius;
                font-family: $font-stack;
                font-size: 11.5px;
                font-weight: 500;
                letter-spacing: 0.03em;
                color: var(--text-secondary);
                cursor: pointer;
                transition:
                    background $transition-speed,
                    color $transition-speed;

                &:hover {
                    background: var(--button-hover);
                    color: var(--text);
                }

                &:active {
                    background: var(--button-active);
                }
            }
        }
    }

    .editor {
        flex: 1;
        padding: 24px 28px;
        border: none;
        outline: none;
        resize: none;
        background: var(--bg);
        color: var(--text);
        font-family: $font-stack;
        font-size: 13.5px;
        line-height: 1.75;
        letter-spacing: 0.01em;
        tab-size: 4;
        caret-color: var(--accent);

        &::placeholder {
            color: var(--placeholder);
            font-style: italic;
        }

        &::selection {
            background: var(--button-active);
        }
    }
}
</style>
