import { useState } from 'react';
import './App.css';

interface DataItem {
  key: number;  // 1 for valid, 0 for invalid
  text: string; // Expression to be judged
}

interface Group {
  name: string;
  tasks: DataItem[];
}

// Two groups:
// Group A: uses quotes
// Group B: uses '---' for string concatenation
const groups: Group[] = [
  {
    name: "Group A (Quotes)",
    tasks: [
      // VALID examples
      { key: 1, text: `X="Hello" AND "Hello"="Hello"` },
      { key: 1, text: `"X"="X" AND X="X"` },
      { key: 1, text: `"X"="X" AND "X"="X" AND X=X` },
      // INVALID examples
      { key: 0, text: `X="X AND X="X` },          // Missing closing quote
      { key: 0, text: `"X"= AND X=X` },           // Expression breaks after "X"=
      { key: 0, text: `"X"="X AND "X"="X` },       // Mixed/missing quotes
    ],
  },
  {
    name: "Group B (--- Concatenation)",
    tasks: [
      // VALID examples
      { key: 1, text: `X---"Hello" = "Hello"---X` },
      { key: 1, text: `X---X = X---X AND "X"---"X" = "XX"` },
      // INVALID examples
      { key: 0, text: `X---"X" AND ---X` },     // Incomplete left-hand side
      { key: 0, text: `"X"--- AND X=X` },       // Expression breaks after "X"---
      { key: 0, text: `---X = X--- AND "X"="X` }, // Leading '---' is malformed
    ],
  },
];

type Phase = "explanation" | "setup" | "experiment" | "results";

interface ExperimentState {
  items: DataItem[];
  currentTrial: number;
  correctCount: number;
  startTime: number;
  endTime: number;
}

// Modal props for confirmations or simple messages
interface ModalProps {
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  onClose?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  onClose,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <p>{message}</p>
        <div className="modal-buttons">
          {onConfirm ? (
            <>
              <button className="modal-button confirm" onClick={onConfirm}>
                {confirmText}
              </button>
              <button className="modal-button cancel" onClick={onCancel}>
                {cancelText}
              </button>
            </>
          ) : (
            <button className="modal-button" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Shuffle utility
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function App() {
  const [phase, setPhase] = useState<Phase>("explanation");

  // Which group is selected (index in 'groups' array)
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  // How many items to test from the chosen group
  const [experimentCount, setExperimentCount] = useState<number>(0);
  const [inputCount, setInputCount] = useState<string>("");

  // Current experiment data
  const [experimentState, setExperimentState] = useState<ExperimentState | null>(null);

  // Feedback for "Correct!" or "Incorrect!"
  const [feedback, setFeedback] = useState<string>("");

  // Modal for confirmations or warnings
  const [modal, setModal] = useState<ModalProps | null>(null);

  // Explanation -> Setup
  const handleStart = () => {
    setPhase("setup");
  };

  // Begin experiment
  const handleBeginExperiment = () => {
    const groupTasks = groups[selectedGroupIndex].tasks;
    const maxCount = groupTasks.length;

    const count = parseInt(inputCount, 10);
    if (isNaN(count) || count < 1 || count > maxCount) {
      setModal({
        message: `Please enter a valid number between 1 and ${maxCount}`,
        onClose: () => setModal(null),
      });
      return;
    }
    setExperimentCount(count);

    // Shuffle tasks from the chosen group
    const shuffled = shuffleArray(groupTasks).slice(0, count);
    setExperimentState({
      items: shuffled,
      currentTrial: 0,
      correctCount: 0,
      startTime: Date.now(),
      endTime: 0,
    });

    setPhase("experiment");
  };

  // Validate the user's response
  const handleValidation = (isValid: boolean) => {
    if (!experimentState) return;

    const { items, currentTrial } = experimentState;
    const currentItem = items[currentTrial];
    const isCorrect = (isValid && currentItem.key === 1) || (!isValid && currentItem.key === 0);

    setFeedback(isCorrect ? "Correct!" : "Incorrect!");

    setTimeout(() => {
      const nextTrial = currentTrial + 1;
      if (nextTrial >= experimentCount) {
        // Done
        setExperimentState({
          ...experimentState,
          currentTrial: nextTrial,
          correctCount: experimentState.correctCount + (isCorrect ? 1 : 0),
          endTime: Date.now(),
        });
        setPhase("results");
      } else {
        // Move to next
        setExperimentState({
          ...experimentState,
          currentTrial: nextTrial,
          correctCount: experimentState.correctCount + (isCorrect ? 1 : 0),
        });
      }
      setFeedback("");
    }, 1000);
  };

  // Cancel experiment
  const handleCancel = () => {
    setModal({
      message: "Are you sure you want to cancel the experiment?",
      onConfirm: () => {
        setPhase("setup");
        setExperimentState(null);
        setModal(null);
      },
      onCancel: () => setModal(null),
      confirmText: "Yes",
      cancelText: "No",
    });
  };

  // Reset experiment
  const handleReset = () => {
    setModal({
      message: "Are you sure you want to reset the experiment?",
      onConfirm: () => {
        if (experimentCount > 0) {
          const groupTasks = groups[selectedGroupIndex].tasks;
          const shuffled = shuffleArray(groupTasks).slice(0, experimentCount);
          setExperimentState({
            items: shuffled,
            currentTrial: 0,
            correctCount: 0,
            startTime: Date.now(),
            endTime: 0,
          });
        }
        setModal(null);
      },
      onCancel: () => setModal(null),
      confirmText: "Yes",
      cancelText: "No",
    });
  };

  // After finishing => user can go back to setup
  const handleTryAgain = () => {
    setPhase("setup");
    setExperimentState(null);
    setInputCount("");
  };

  // Render results
  let resultsView = null;
  if (phase === "results" && experimentState) {
    const timeTaken = ((experimentState.endTime - experimentState.startTime) / 1000).toFixed(2);
    const accuracy = ((experimentState.correctCount / experimentCount) * 100).toFixed(2);

    resultsView = (
      <div className="results">
        <h2>Results</h2>
        <p>Time Taken: {timeTaken} seconds</p>
        <p>Accuracy: {accuracy}%</p>
        <p>
          ({experimentState.correctCount} out of {experimentCount})
        </p>
        <button onClick={handleTryAgain}>Try Again</button>
      </div>
    );
  }

  // Experiment view
  const experimentView = () => {
    if (!experimentState) return null;

    const { currentTrial, items } = experimentState;
    const currentItem = items[currentTrial];
    return (
      <div className="experiment">
        <p className="progress">
          Trial {currentTrial + 1} / {experimentCount}
        </p>
        {currentItem && (
          <>
            <p className="statement">{currentItem.text}</p>
            <div className="button-group">
              <button className="valid-button" onClick={() => handleValidation(true)}>
                Valid
              </button>
              <button className="invalid-button" onClick={() => handleValidation(false)}>
                Not Valid
              </button>
            </div>
          </>
        )}
        <div className="control-buttons">
          <button onClick={handleCancel}>Cancel</button>
          <button onClick={handleReset}>Reset</button>
        </div>
        {feedback && <p className="feedback">{feedback}</p>}
      </div>
    );
  };

  // Setup view => user picks group and # of tasks
  const setupView = () => {
    const maxCount = groups[selectedGroupIndex].tasks.length;
    return (
      <div className="setup">
        <p>
          Select which group of tasks to use:
        </p>
        <select
          value={selectedGroupIndex}
          onChange={(e) => setSelectedGroupIndex(parseInt(e.target.value, 10))}
        >
          {groups.map((g, index) => (
            <option key={index} value={index}>
              {g.name}
            </option>
          ))}
        </select>

        <p>Enter the number of items to go through (max {maxCount}):</p>
        <input
          type="number"
          value={inputCount}
          onChange={(e) => setInputCount(e.target.value)}
          min="1"
          max={maxCount}
        />
        <button onClick={handleBeginExperiment}>Begin Experiment</button>
      </div>
    );
  };

  // Explanation => initial instructions
  const explanationView = () => (
    <div className="explanation">
      <h2>Welcome to the Validation Experiment</h2>
      <p>
        In this experiment, you will see strings that may or may not be valid expressions. 
        Your job is to decide if each expression is valid <strong>([1])</strong> or invalid <strong>([0])</strong>.
      </p>
      <p>
        We have two groups of expressions:
      </p>
      <ul>
        <li><strong>Group A (Quotes)</strong>: uses quotation marks, e.g., "X"="X".</li>
        <li><strong>Group B (---)</strong>: uses the <code>---</code> operator for string concatenation.</li>
      </ul>
      <p>
        We want to see whether using quotes or <code>---</code> affects accuracy or speed.
        You can also do a training phase (not shown here) to practice before starting.
      </p>
      <p>
        When ready, click the button below to proceed.
      </p>
      <button onClick={handleStart}>Start</button>
    </div>
  );

  // Phase-specific content in bottom pane
  let bottomPaneContent;
  switch (phase) {
    case "setup":
      bottomPaneContent = setupView();
      break;
    case "experiment":
      bottomPaneContent = experimentView();
      break;
    case "results":
      bottomPaneContent = resultsView;
      break;
    default:
      bottomPaneContent = explanationView();
      break;
  }

  return (
    <div className="App dark-mode">
      <div className="container">
        {/* 
          top-pane for a heading, if you want.
          If you prefer the explanation only in the explanationView, 
          you can remove top-pane or keep minimal text here. 
        */}
        <div className="top-pane">
          <h1>Comparison of Quotes vs. ---</h1>
          <p>
            Below, you'll choose a group and how many tasks to attempt. 
            Then, for each expression, click "Valid" or "Not Valid." 
          </p>
        </div>

        <div className="bottom-pane">
          {bottomPaneContent}
        </div>
      </div>
      {modal && <Modal {...modal} />}
    </div>
  );
}

export default App;
