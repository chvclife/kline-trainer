import Button from "../common/Button";
import { useTrade } from "../../hooks/useTrade";
import { useTrainingStore } from "../../store/trainingStore";
import "./TradePanel.css";

const PRESET_PERCENTAGES = [100, 75, 50, 25];

interface PercentageSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

function PercentageSelector({ value, onChange }: PercentageSelectorProps) {
  const isPreset = PRESET_PERCENTAGES.includes(value);

  return (
    <div className="pct-selector">
      <div className="pct-selector__presets">
        {PRESET_PERCENTAGES.map((pct) => (
          <button
            key={pct}
            className={`pct-selector__btn${value === pct ? " pct-selector__btn--active" : ""}`}
            onClick={() => onChange(pct)}
          >
            {pct}%
          </button>
        ))}
      </div>
      <div className="pct-selector__custom">
        <input
          className="pct-selector__input"
          type="number"
          min={1}
          max={100}
          value={isPreset ? "" : value}
          placeholder="自訂"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1 && v <= 100) {
              onChange(v);
            }
          }}
          onFocus={(e) => {
            // Clear preset selection when focusing custom input
            if (isPreset) {
              e.target.value = "";
            }
          }}
        />
        <span className="pct-selector__unit">%</span>
      </div>
    </div>
  );
}

export default function TradePanel() {
  const { doBuy, doSell, position } = useTrade();
  const buyPercentage = useTrainingStore((s) => s.buyPercentage);
  const sellPercentage = useTrainingStore((s) => s.sellPercentage);
  const setBuyPercentage = useTrainingStore((s) => s.setBuyPercentage);
  const setSellPercentage = useTrainingStore((s) => s.setSellPercentage);

  const hasPosition = position > 0.001;

  return (
    <div className="trade-panel">
      <div className="trade-panel__side">
        <Button variant="bull" onClick={() => doBuy()} disabled={position >= 1}>
          ▲ 買入
        </Button>
        <PercentageSelector value={buyPercentage} onChange={setBuyPercentage} />
      </div>

      <div className="trade-panel__side">
        <Button variant="bear" onClick={() => doSell()} disabled={!hasPosition}>
          ▼ 賣出
        </Button>
        <PercentageSelector value={sellPercentage} onChange={setSellPercentage} />
      </div>
    </div>
  );
}
