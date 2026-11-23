import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, initialState, useAppStore } from '../store/useAppStore';
import HomeScreen from './HomeScreen';

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomeScreen />
    </MemoryRouter>,
  );

describe('HomeScreen', () => {
  beforeEach(() => {
    useAppStore.setState({ ...initialState, settings: { ...DEFAULT_SETTINGS } });
  });

  it('renders the three mode cards', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'US Geography Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regions.*Name the 7 regions/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /States.*Find all 50 states/ })).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Capitals.*Match capitals to states/ }),
    ).toBeVisible();
  });

  it('updates the round length in the store', async () => {
    renderHome();
    expect(screen.getByRole('button', { name: '10' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '20' }));
    expect(useAppStore.getState().settings.roundLength).toBe(20);
    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(useAppStore.getState().settings.roundLength).toBe('all');
  });

  it('toggles practice mistakes and sound in the store', async () => {
    renderHome();
    await userEvent.click(screen.getByRole('switch', { name: /Practice my mistakes/ }));
    expect(useAppStore.getState().settings.practiceMistakes).toBe(true);
    await userEvent.click(screen.getByRole('switch', { name: /Sound effects/ }));
    expect(useAppStore.getState().settings.sound).toBe(false);
  });

  it('asks for confirmation before resetting progress', async () => {
    useAppStore.setState({ bestScores: { states: { stars: 3, bestPct: 100, lastPlayed: 'x' } } });
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Reset my progress' }));
    expect(useAppStore.getState().bestScores.states).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, reset' }));
    expect(useAppStore.getState().bestScores).toEqual({});
  });
});
