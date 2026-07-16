import Button from "../common/Button";
import Slider from "../common/Slider";
import { useTraining } from "../../hooks/useTraining";

export default function TrainingPanel() {
  const {
    stepForward,
    startReplay,
    stopReplay,
    playMode,
    playSpeed,
    setPlaySpeed,
    currentIndex,
    dataLength,
  } = useTraining();

  const isPlaying = playMode === "replay";
  const atEnd = currentIndex >= dataLength - 1;

  return (
    <div className="training-panel">
      <div className="training-panel__progress">
        <span className="training-panel__label">
          {currentIndex + 1} / {dataLength}
        </span>
        <div className="training-panel__bar">
          <div
            className="training-panel__bar-fill"
            style={{
              width: dataLength > 0 ? `${((currentIndex + 1) / dataLength) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      <div className="training-panel__controls">
        <Button
          variant="accent"
          onClick={stepForward}
          disabled={atEnd || isPlaying}
        >
          下一步
        </Button>

        {isPlaying ? (
          <Button variant="default" onClick={stopReplay}>
            暫停
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={startReplay}
            disabled={atEnd}
          >
            播放
          </Button>
        )}

        <div className="training-panel__speed">
          <Slider
            value={playSpeed}
            min={1}
            max={10}
            step={1}
            onChange={setPlaySpeed}
            label="速度"
          />
        </div>
      </div>
    </div>
  );
}