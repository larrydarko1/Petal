<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';

// State
const content = ref('');
const filePath = ref<string | null>(null);
const savedContent = ref('');
const isModified = computed(() => content.value !== savedContent.value);

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

    const path = selected as string;
    try {
        const text = await invoke<string>('read_text_file', { path });
        content.value = text;
        filePath.value = path;
        savedContent.value = text;
    } catch (err) {
        console.error('Failed to open file:', err);
    }
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

    if (key === 'n') { e.preventDefault(); newFile(); }
    else if (key === 'o') { e.preventDefault(); openFile(); }
    else if (e.shiftKey && key === 's') { e.preventDefault(); saveFileAs(); }
    else if (key === 's') { e.preventDefault(); saveFile(); }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
    <div class="notepad">
        <header class="toolbar">
            <div class="file-info">
                <span class="file-name">{{ fileName }}</span>
                <span v-if="isModified" class="modified-indicator">— Edited</span>
            </div>
            <nav class="actions">
                <button @click="newFile" title="New file (⌘N)">New</button>
                <button @click="openFile" title="Open file (⌘O)">Open</button>
                <button @click="saveFile" title="Save file (⌘S)">Save</button>
                <button @click="saveFileAs" title="Save as (⌘⇧S)">Save As</button>
            </nav>
        </header>
        <textarea
            v-model="content"
            class="editor"
            placeholder="Start typing..."
            spellcheck="false"
        />
    </div>
</template>

<style>
*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg: #ffffff;
    --toolbar-bg: #f8f8f8;
    --border: #e5e5e5;
    --text: #1a1a1a;
    --text-secondary: #999999;
    --button-hover: #ebebeb;

    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #1a1a1a;
        --toolbar-bg: #222222;
        --border: #333333;
        --text: #e0e0e0;
        --text-secondary: #666666;
        --button-hover: #2e2e2e;
    }
}

html, body, #app {
    height: 100%;
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
}
</style>

<style scoped>
.notepad {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 44px;
    min-height: 44px;
    border-bottom: 1px solid var(--border);
    background: var(--toolbar-bg);
    user-select: none;
    -webkit-user-select: none;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.file-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.modified-indicator {
    font-size: 12px;
    color: var(--text-secondary);
}

.actions {
    display: flex;
    gap: 2px;
}

.actions button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    cursor: pointer;
    transition: background 0.15s;
}

.actions button:hover {
    background: var(--button-hover);
}

.editor {
    flex: 1;
    padding: 20px 24px;
    border: none;
    outline: none;
    resize: none;
    background: var(--bg);
    color: var(--text);
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    tab-size: 4;
}

.editor::placeholder {
    color: var(--text-secondary);
}
</style>