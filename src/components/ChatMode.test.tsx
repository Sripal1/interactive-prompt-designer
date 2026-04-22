import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { ChatMode, type ChatTurn } from './ChatMode';
import { useSession } from '@/store/session';

const initialSession = useSession.getState();

function resetSession() {
  useSession.setState(
    {
      ...initialSession,
      sessionId: 'test-session',
      startedAt: 0,
      taskLabel: '',
      mode: 'chat',
      stage: 'working',
      runs: [],
      events: [],
      streaming: false,
      currentOutput: '',
      error: null,
    },
    true,
  );
}

function renderChatMode(overrides: Partial<ComponentProps<typeof ChatMode>> = {}) {
  const props: ComponentProps<typeof ChatMode> = {
    turns: [],
    onSend: vi.fn(),
    onStop: vi.fn(),
    onClear: vi.fn(),
    onRate: vi.fn(),
    canSend: true,
    canClear: false,
    ...overrides,
  };

  return {
    ...render(<ChatMode {...props} />),
    props,
  };
}

describe('ChatMode', () => {
  beforeEach(() => {
    resetSession();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows live streaming output in the pending assistant bubble', () => {
    useSession.setState({ streaming: true, currentOutput: 'Streaming reply...' });

    const turns: ChatTurn[] = [
      { role: 'user', content: 'Hello', at: 1 },
      { role: 'assistant', content: '', at: 2, pending: true },
    ];

    renderChatMode({ turns });

    expect(screen.getByText('Streaming reply...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('submits on Enter when sending is allowed', () => {
    const onSend = vi.fn();
    renderChatMode({ onSend, canSend: true });

    const input = screen.getByPlaceholderText('Message the model directly…');
    fireEvent.change(input, { target: { value: 'Draft a summary' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('Draft a summary');
  });

  it('does not submit on Enter when sending is disabled', () => {
    const onSend = vi.fn();
    renderChatMode({ onSend, canSend: false });

    const input = screen.getByPlaceholderText('Message the model directly…');
    fireEvent.change(input, { target: { value: 'Hello anyway' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables Clear when there is nothing to clear', () => {
    renderChatMode({ canClear: false });
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});
