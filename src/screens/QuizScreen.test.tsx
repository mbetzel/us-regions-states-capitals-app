import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { mulberry32 } from '../quiz/rng';
import { DEFAULT_SETTINGS, initialState, useAppStore } from '../store/useAppStore';
import HomeScreen from './HomeScreen';
import QuizScreen from './QuizScreen';

const renderQuiz = (path = '/quiz/states') => {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomeScreen /> },
      { path: '/quiz/:mode', element: <QuizScreen /> },
      { path: '/results/:mode', element: <p>Results page</p> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
};

const answerButtons = () =>
  within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');

describe('QuizScreen', () => {
  beforeEach(() => {
    useAppStore.setState({ ...initialState, settings: { ...DEFAULT_SETTINGS } });
    useAppStore.getState().startRound('states', mulberry32(42));
  });

  it('shows the first question with four answers and progress', () => {
    renderQuiz();
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(screen.getByText('What state is highlighted?')).toBeInTheDocument();
    expect(answerButtons()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Next/ })).toBeNull();
  });

  it('shows feedback and a Next button after clicking an answer', async () => {
    renderQuiz();
    const { answer } = useAppStore.getState().activeRound!.questions[0];
    const buttons = answerButtons();
    await userEvent.click(buttons[0]);

    const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
    if (buttons[0].getAttribute('data-state') === 'correct') {
      expect(live).toHaveTextContent(/Awesome!|You got it!|Geography genius!|Super!|Way to go!/);
    } else {
      expect(buttons[0]).toHaveAttribute('data-state', 'wrong');
      expect(live).toHaveTextContent(`Nice try! That's ${answer}.`);
      expect(live).toHaveTextContent("You'll get it next time!");
      expect(screen.getAllByText("You'll get it next time!")).toHaveLength(1);
    }
    expect(answerButtons().every((b) => b.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByRole('button', { name: 'Next ➜' })).toHaveFocus();
  });

  it('answers with the number keys and reveals the correct answer', async () => {
    renderQuiz();
    const { answer, choices } = useAppStore.getState().activeRound!.questions[0];
    await userEvent.keyboard('1');

    expect(useAppStore.getState().activeRound!.answers[0]).toBe(choices[0]);
    const correctIndex = choices.indexOf(answer);
    const states = answerButtons().map((b) => b.getAttribute('data-state'));
    expect(states[correctIndex]).toMatch(/^(correct|reveal-correct)$/);
    expect(screen.getByRole('button', { name: 'Next ➜' })).toBeVisible();
  });

  it('ignores number keys after the question is answered', async () => {
    renderQuiz();
    await userEvent.keyboard('1');
    const first = useAppStore.getState().activeRound!.answers[0];
    await userEvent.keyboard('2');
    expect(useAppStore.getState().activeRound!.answers[0]).toBe(first);
  });

  it('advances to the next question with the Next button', async () => {
    renderQuiz();
    await userEvent.keyboard('1');
    await userEvent.click(screen.getByRole('button', { name: 'Next ➜' }));
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it('advances with Enter when focus is not on a button', async () => {
    renderQuiz();
    await userEvent.keyboard('1');
    (document.activeElement as HTMLElement).blur();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it('moves focus to the question heading when the next question appears', async () => {
    renderQuiz();
    await userEvent.keyboard('1');
    await userEvent.click(screen.getByRole('button', { name: 'Next ➜' }));
    expect(screen.getByRole('heading', { name: 'What state is highlighted?' })).toHaveFocus();
  });

  it('redirects home when there is no active round', () => {
    useAppStore.setState({ activeRound: null });
    renderQuiz();
    expect(screen.getByRole('heading', { name: 'US Geography Quiz' })).toBeInTheDocument();
  });
});
