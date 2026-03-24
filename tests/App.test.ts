// App — component behaviour: initial state, modified indicator, file operations.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../src/App.vue';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn(), ask: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';

describe('App', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('initial state', () => {
        it('shows "Untitled" when no file is open', () => {
            const wrapper = mount(App);
            expect(wrapper.find('.file-name').text()).toBe('Untitled');
        });

        it('does not show the modified indicator on a clean slate', () => {
            const wrapper = mount(App);
            expect(wrapper.find('.modified-dot').exists()).toBe(false);
        });
    });

    describe('modified indicator', () => {
        it('appears once text is typed', async () => {
            const wrapper = mount(App);
            await wrapper.find('textarea').setValue('hello');
            expect(wrapper.find('.modified-dot').exists()).toBe(true);
        });
    });

    describe('newFile()', () => {
        it('clears content without prompting when there are no unsaved changes', async () => {
            const wrapper = mount(App);
            await wrapper.find('[title="New file (⌘N)"]').trigger('click');
            expect(vi.mocked(ask)).not.toHaveBeenCalled();
            expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
        });

        it('prompts before discarding and preserves content when user cancels', async () => {
            vi.mocked(ask).mockResolvedValue(false);
            const wrapper = mount(App);
            await wrapper.find('textarea').setValue('unsaved content');
            await wrapper.find('[title="New file (⌘N)"]').trigger('click');
            await wrapper.vm.$nextTick();
            expect(vi.mocked(ask)).toHaveBeenCalledOnce();
            expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('unsaved content');
        });
    });

    describe('openFile()', () => {
        it('does nothing when the native dialog is cancelled', async () => {
            vi.mocked(open).mockResolvedValue(null);
            const wrapper = mount(App);
            await wrapper.find('[title="Open file (⌘O)"]').trigger('click');
            await wrapper.vm.$nextTick();
            expect(vi.mocked(invoke)).not.toHaveBeenCalled();
        });

        it('reads the file and updates the filename and content on success', async () => {
            const fakePath = '/tmp/note.txt';
            vi.mocked(open).mockResolvedValue(fakePath);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(invoke).mockResolvedValue('file content' as any);
            const wrapper = mount(App);
            await wrapper.find('[title="Open file (⌘O)"]').trigger('click');
            await wrapper.vm.$nextTick();
            expect(vi.mocked(invoke)).toHaveBeenCalledWith('read_text_file', { path: fakePath });
            expect(wrapper.find('.file-name').text()).toBe('note.txt');
            expect(wrapper.find('.modified-indicator').exists()).toBe(false);
        });
    });

    describe('saveFile()', () => {
        it('opens save-as dialog when no file is currently open', async () => {
            vi.mocked(save).mockResolvedValue(null);
            const wrapper = mount(App);
            await wrapper.find('[title="Save file (⌘S)"]').trigger('click');
            await wrapper.vm.$nextTick();
            expect(vi.mocked(save)).toHaveBeenCalledOnce();
        });

        it('writes to the existing path without re-showing a dialog', async () => {
            const fakePath = '/tmp/note.txt';
            vi.mocked(open).mockResolvedValue(fakePath);
            vi.mocked(invoke)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .mockResolvedValueOnce('original content' as any) // read_text_file
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .mockResolvedValueOnce(undefined as any); // write_text_file
            const wrapper = mount(App);
            await wrapper.find('[title="Open file (⌘O)"]').trigger('click');
            await wrapper.vm.$nextTick();
            await wrapper.find('textarea').setValue('edited content');
            await wrapper.find('[title="Save file (⌘S)"]').trigger('click');
            await wrapper.vm.$nextTick();
            expect(vi.mocked(save)).not.toHaveBeenCalled();
            expect(vi.mocked(invoke)).toHaveBeenLastCalledWith('write_text_file', {
                path: fakePath,
                content: 'edited content',
            });
        });
    });
});
