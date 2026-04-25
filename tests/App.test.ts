// App — component behaviour: initial state, modified indicator, file operations.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import App from '../src/App.vue';

// vi.hoisted ensures these refs are initialised before vi.mock factories run
const { mockClose, closeHandlers } = vi.hoisted(() => ({
    mockClose: vi.fn(),
    closeHandlers: {
        current: undefined as ((e: { preventDefault(): void }) => Promise<void>) | undefined,
    },
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(vi.fn()) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn(), ask: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(() => ({
        onCloseRequested: vi.fn(async (cb: (e: { preventDefault(): void }) => Promise<void>) => {
            closeHandlers.current = cb;
            return vi.fn();
        }),
        close: mockClose,
    })),
}));

import { invoke } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        closeHandlers.current = undefined;
    });

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
            expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('read_text_file', expect.any(Object));
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

    describe('close window with unsaved changes', () => {
        it('does not prompt when there are no unsaved changes', async () => {
            mount(App);
            await flushPromises();
            const event = { preventDefault: vi.fn() };
            await closeHandlers.current?.(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(vi.mocked(ask)).not.toHaveBeenCalled();
        });

        it('prevents close and shows a warning dialog when there are unsaved changes', async () => {
            vi.mocked(ask).mockResolvedValue(false);
            const wrapper = mount(App);
            await flushPromises();
            await wrapper.find('textarea').setValue('unsaved text');
            const event = { preventDefault: vi.fn() };
            await closeHandlers.current?.(event);
            expect(event.preventDefault).toHaveBeenCalledOnce();
            expect(vi.mocked(ask)).toHaveBeenCalledOnce();
            expect(mockClose).not.toHaveBeenCalled();
        });

        it('destroys the window when the user confirms closing with unsaved changes', async () => {
            vi.mocked(ask).mockResolvedValue(true);
            const wrapper = mount(App);
            await flushPromises();
            await wrapper.find('textarea').setValue('unsaved text');
            const event = { preventDefault: vi.fn() };
            await closeHandlers.current?.(event);
            expect(event.preventDefault).toHaveBeenCalledOnce();
            expect(mockClose).toHaveBeenCalledOnce();
        });
    });
});
